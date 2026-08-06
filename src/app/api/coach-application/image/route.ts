import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isMissingAuthSessionError, rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function readBodyWithLimit(request: NextRequest, maxBytes: number) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (total === 0) return null;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") {
    return bytes.length >= 12
      && ascii(bytes, 0, 4) === "RIFF"
      && ascii(bytes, 8, 4) === "WEBP";
  }
  return false;
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) {
      return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    }
    if (!authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in to upload a coach profile image." }, { status: 401 }));
    }
    const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      return applyCookies(NextResponse.json({ error: "Profile image uploads are temporarily unavailable." }, { status: 503 }));
    }
    const storageAdmin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: reserved, error: reservationError } = await storageAdmin.rpc(
      "reserve_coach_profile_image_upload",
      { target_user_id: authData.user.id },
    );
    if (reservationError) {
      return applyCookies(NextResponse.json({ error: "Profile image uploads are temporarily unavailable." }, { status: 503 }));
    }
    if (reserved !== true) {
      return applyCookies(NextResponse.json({ error: "Please wait before uploading another profile image." }, { status: 429 }));
    }

    const imageType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    const extension = allowedTypes.get(imageType);
    const declaredLength = Number(request.headers.get("content-length"));
    if ((Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) || !extension) {
      return applyCookies(NextResponse.json({ error: "Upload a JPEG, PNG, or WebP image up to 5 MB." }, { status: 400 }));
    }
    const bytes = await readBodyWithLimit(request, MAX_IMAGE_BYTES);
    if (!bytes || !hasValidSignature(imageType, bytes)) {
      return applyCookies(NextResponse.json({ error: "Upload a valid JPEG, PNG, or WebP image up to 25 megapixels." }, { status: 400 }));
    }

    let processedImage: Buffer;
    try {
      const pipeline = sharp(bytes, { failOn: "error", limitInputPixels: 25_000_000 });
      const metadata = await pipeline.metadata();
      if (!metadata.width || !metadata.height
        || metadata.width > 8192 || metadata.height > 8192
        || metadata.width * metadata.height > 25_000_000) {
        throw new Error("invalid image dimensions");
      }
      processedImage = await pipeline
        .rotate()
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      if (processedImage.length === 0 || processedImage.length > 5 * 1024 * 1024) throw new Error("invalid processed image");
    } catch {
      return applyCookies(NextResponse.json({ error: "Upload a complete, valid JPEG, PNG, or WebP image up to 25 megapixels." }, { status: 400 }));
    }

    const bucket = storageAdmin.storage.from("coach-profile-images");
    const path = `${authData.user.id}/${randomUUID()}.webp`;
    const { error: uploadError } = await bucket.upload(path, new Uint8Array(processedImage), {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) {
      return applyCookies(NextResponse.json({ error: "The profile image could not be uploaded." }, { status: 503 }));
    }
    const { data: signedData, error: signedError } = await bucket.createSignedUrl(path, 3600);
    if (signedError || !signedData?.signedUrl) {
      return applyCookies(NextResponse.json({ error: "The profile image was saved, but its preview is temporarily unavailable." }, { status: 503 }));
    }
    return applyCookies(NextResponse.json({ path, url: signedData.signedUrl }, { status: 201 }));
  } catch {
    return NextResponse.json({ error: "The profile image could not be uploaded." }, { status: 400 });
  }
}
