import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://free-tips.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cabinet/", "/admin/", "/pay/", "/api/", "/login", "/register", "/forgot-password", "/change-password"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
