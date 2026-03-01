/**
 * Явный маршрут GET /sitemap.xml для совместимости со standalone-сборкой и прокси.
 * Дублирует данные из app/sitemap.ts.
 */
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://free-tips.ru";

const publicPaths: { path: string; priority: number; changeFrequency: string }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/kontakty", priority: 0.8, changeFrequency: "monthly" },
  { path: "/oferta", priority: 0.5, changeFrequency: "yearly" },
  { path: "/politika", priority: 0.5, changeFrequency: "yearly" },
  { path: "/politika-bezopasnosti", priority: 0.5, changeFrequency: "yearly" },
  { path: "/oplata-dostavka-vozvrat", priority: 0.5, changeFrequency: "yearly" },
  { path: "/zayavka", priority: 0.7, changeFrequency: "monthly" },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function GET() {
  const lastmod = new Date().toISOString();
  const urls = publicPaths
    .map(
      ({ path, priority, changeFrequency }) =>
        `  <url>\n    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
