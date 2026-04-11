import type { Metadata } from "next";
import { TestPreviewRibbon } from "@/components/test-preview/TestPreviewRibbon";
import { TestPreviewVisualLanding } from "@/components/test-preview/TestPreviewVisualLanding";

export const metadata: Metadata = {
  title: "Визуальная спека · лендинг",
  robots: { index: false, follow: false },
};

export default function TestPreviewVisualPage() {
  return (
    <>
      <TestPreviewRibbon />
      <TestPreviewVisualLanding />
    </>
  );
}
