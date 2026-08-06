import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
const signedImagePattern = (() => {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      protocol: url.protocol === "https:" ? "https" as const : "http" as const,
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/sign/coach-profile-images/**",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  ...(signedImagePattern ? {
    images: { remotePatterns: [signedImagePattern] },
  } : {}),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
