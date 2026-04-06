import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://free-tips.ru";

const routes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/en", priority: 0.85, changeFrequency: "monthly" },
  { path: "/kontakty", priority: 0.8, changeFrequency: "monthly" },
  { path: "/zayavka", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pomoshch", priority: 0.65, changeFrequency: "monthly" },
  { path: "/pomoshch/podklyuchenie", priority: 0.55, changeFrequency: "monthly" },
  { path: "/pomoshch/bezopasnost-platezhey", priority: 0.55, changeFrequency: "monthly" },
  { path: "/pomoshch/mobilnoe-prilozhenie", priority: 0.55, changeFrequency: "monthly" },
  { path: "/dlya-zavedenij", priority: 0.6, changeFrequency: "monthly" },
  { path: "/oferta", priority: 0.5, changeFrequency: "yearly" },
  { path: "/politika", priority: 0.5, changeFrequency: "yearly" },
  { path: "/politika-bezopasnosti", priority: 0.5, changeFrequency: "yearly" },
  { path: "/politika-vozvrata", priority: 0.5, changeFrequency: "yearly" },
  { path: "/pravila-ispolzovaniya", priority: 0.5, changeFrequency: "yearly" },
  { path: "/oplata-dostavka-vozvrat", priority: 0.5, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
