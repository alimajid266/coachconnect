import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  updateProfile: vi.fn(),
  ensureDraft: vi.fn(),
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
  rpc: vi.fn(),
  attachAd: vi.fn(),
  application: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.application }),
      }),
    }),
    storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.createSignedUrl, list: mocks.list, remove: mocks.remove }) },
  }),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: { getUser: mocks.getUser },
      rpc: mocks.attachAd,
      from: (table: string) => table === "profiles"
        ? {
            select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
            update: mocks.updateProfile,
          }
        : { upsert: mocks.ensureDraft },
    },
    applyCookies: mocks.applyCookies,
  }),
}));

import { POST } from "@/app/api/coach-application/image/route";

function imageRequest(file: File, purpose?: "avatar" | "coach-ad") {
  return new NextRequest(`http://127.0.0.1:3000/api/coach-application/image${purpose ? `?purpose=${purpose}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
}

describe("coach profile image upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-service-role-key");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { account_status: "ACTIVE" }, error: null });
    mocks.updateProfile.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mocks.ensureDraft.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.attachAd.mockResolvedValue({ data: true, error: null });
    mocks.application.mockResolvedValue({ data: null, error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.upload.mockResolvedValue({ data: { path: "11111111-1111-4111-8111-111111111111/image.webp" }, error: null });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://images.example/private-signed.webp" }, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fully decodes, normalizes, and stores an immutable bounded profile image", async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#336699" },
    }).png().toBuffer();
    const response = await POST(imageRequest(new File([new Uint8Array(png)], "portrait.png", { type: "image/png" })));
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith("reserve_coach_profile_image_upload", {
      target_user_id: "11111111-1111-4111-8111-111111111111",
    });
    const uploadedPath = mocks.upload.mock.calls[0]?.[0] as string;
    expect(uploadedPath).toMatch(/^11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\.webp$/);
    expect(mocks.upload).toHaveBeenCalledWith(
      uploadedPath,
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/webp", upsert: false }),
    );
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(uploadedPath, 3600);
    expect(await response.json()).toEqual({
      path: uploadedPath,
      url: "https://images.example/private-signed.webp",
      purpose: "coach-ad",
    });
  });

  it("lets any active member save the upload as their account profile picture", async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#336699" },
    }).png().toBuffer();
    const response = await POST(imageRequest(new File([new Uint8Array(png)], "avatar.png", { type: "image/png" }), "avatar"));
    const uploadedPath = mocks.upload.mock.calls[0]?.[0] as string;

    expect(response.status).toBe(201);
    expect(mocks.updateProfile).toHaveBeenCalledWith({ avatar_path: uploadedPath });
    expect(await response.json()).toMatchObject({ path: uploadedPath, purpose: "avatar" });
  });

  it("immediately attaches a coach-ad upload to the coach profile", async () => {
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#336699" } }).png().toBuffer();
    const response = await POST(imageRequest(new File([new Uint8Array(png)], "ad.png", { type: "image/png" }), "coach-ad"));
    const uploadedPath = mocks.upload.mock.calls[0]?.[0] as string;
    expect(response.status).toBe(201);
    expect(mocks.ensureDraft).toHaveBeenCalledWith(
      { user_id: "11111111-1111-4111-8111-111111111111" },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    expect(mocks.attachAd).toHaveBeenCalledWith("attach_coach_ad_image", { image_path: uploadedPath });
    expect(await response.json()).toMatchObject({ path: uploadedPath, purpose: "coach-ad" });
  });

  it("removes an uploaded object when it cannot be attached as a coach ad", async () => {
    mocks.attachAd.mockResolvedValue({ data: null, error: { message: "Coach application required" } });
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#336699" } }).png().toBuffer();
    const response = await POST(imageRequest(new File([new Uint8Array(png)], "ad.png", { type: "image/png" }), "coach-ad"));
    const uploadedPath = mocks.upload.mock.calls[0]?.[0] as string;
    expect(response.status).toBe(403);
    expect(mocks.remove).toHaveBeenCalledWith([uploadedPath]);
  });

  it("uses independent immutable paths and never deletes another upload", async () => {
    const png = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#663399" },
    }).png().toBuffer();
    const file = () => new File([new Uint8Array(png)], "replacement.png", { type: "image/png" });

    const first = await POST(imageRequest(file()));
    const second = await POST(imageRequest(file()));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstPath = mocks.upload.mock.calls[0]?.[0] as string;
    const secondPath = mocks.upload.mock.calls[1]?.[0] as string;
    expect(firstPath).not.toBe(secondPath);
    expect(mocks.upload).toHaveBeenNthCalledWith(
      1,
      firstPath,
      expect.any(Uint8Array),
      expect.objectContaining({ upsert: false }),
    );
    expect(mocks.upload).toHaveBeenNthCalledWith(
      2,
      secondPath,
      expect.any(Uint8Array),
      expect.objectContaining({ upsert: false }),
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("rejects unsupported content before storage", async () => {
    const response = await POST(imageRequest(new File(["text"], "profile.svg", { type: "image/svg+xml" })));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects truncated images with plausible headers before storage", async () => {
    const truncatedWebp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 31, 0, 0,
    ]);
    const response = await POST(imageRequest(new File([truncatedWebp], "truncated.webp", { type: "image/webp" })));
    expect(response.status).toBe(400);
    expect(mocks.rpc).toHaveBeenCalledWith("reserve_coach_profile_image_upload", {
      target_user_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects structurally oversized images before storage", async () => {
    const oversizedPng = await sharp({
      create: { width: 8193, height: 1, channels: 3, background: "#ffffff" },
    }).png().toBuffer();
    const response = await POST(imageRequest(new File([new Uint8Array(oversizedPng)], "huge.png", { type: "image/png" })));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("denies a throttled upload before reading any request body bytes", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#ffffff" },
    }).png().toBuffer();
    const request = imageRequest(new File([new Uint8Array(png)], "portrait.png", { type: "image/png" }));
    const getReader = vi.spyOn(request.body!, "getReader");
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(getReader).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("denies uploads from a suspended account before reserving or reading bytes", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: null });
    const response = await POST(imageRequest(new File(["image"], "portrait.png", { type: "image/png" })));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("requires an authenticated member", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError", message: "missing" } });
    const response = await POST(imageRequest(new File(["image"], "portrait.png", { type: "image/png" })));
    expect(response.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
