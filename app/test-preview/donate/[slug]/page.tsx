import type { Metadata } from "next";
import { TestDonateMockClient } from "../TestDonateMockClient";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const label = slug?.toLowerCase() === "demo" ? "Демо-стример" : (slug ?? "стример").replace(/-/g, " ");
  return {
    title: `Донат · ${label} (тест)`,
    robots: { index: false, follow: false },
  };
}

export default async function TestPreviewDonatePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <TestDonateMockClient slug={slug} />;
}
