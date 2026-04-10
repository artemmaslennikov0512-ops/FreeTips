import { TestPreviewRibbon } from "@/components/test-preview/TestPreviewRibbon";
import { TestPreviewLandingAlt } from "@/components/test-preview/landing/TestPreviewLandingAlt";

/** Превью: отдельный визуальный макет (не копия текущего лендинга) — для решения «брать / не брать». */
export default function TestPreviewLandingPage() {
  return (
    <>
      <TestPreviewRibbon />
      <TestPreviewLandingAlt />
    </>
  );
}