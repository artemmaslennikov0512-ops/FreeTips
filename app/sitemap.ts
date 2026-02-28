import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://freetips.ru";

/** Публичные страницы для индексации поисковиками. */
const publicPaths = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/kontakty", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/oferta", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/politika", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/politika-bezopasnosti", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/oplata-dostavka-vozvrat", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/zayavka", priority: 0.7, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
