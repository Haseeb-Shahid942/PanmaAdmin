import type { NextConfig } from "next";

// NOTE: No secrets here. Database settings (DB_HOST, DB_PORT, DB_NAME, DB_USER,
// DB_PASSWORD) are injected by GoDaddy. ADMIN_USER, ADMIN_PASS and SESSION_SECRET
// must be added in the app's Secrets.
const nextConfig: NextConfig = {
  images: {
    domains: ["res.cloudinary.com", "ik.imagekit.io"],
  },
  env: {
    NEXT_PUBLIC_ADMIN_ORIGIN: "https://admin.panamatravel.co.uk",
    NEXT_PUBLIC_ADMIN_UPLOAD_ORIGIN: "https://admin.panamatravel.co.uk",
    NEXT_PUBLIC_SITE_ORIGIN: "https://panamatravel.co.uk",
    ALLOWED_ORIGINS:
      "https://panamatravel.co.uk,https://www.panamatravel.co.uk",
  },
};

export default nextConfig;
