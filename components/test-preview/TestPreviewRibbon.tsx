import Link from "next/link";

type Props = {
  /** Куда вести ссылку «к хабу» */
  hubHref?: string;
};

export function TestPreviewRibbon({ hubHref = "/test-preview" }: Props) {
  return (
    <div
      className="sticky top-0 z-[45] border-b border-[var(--color-dark-gray)]/15 px-4 py-2.5 text-center text-sm"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-brand-gold) 20%, var(--color-bg))",
        color: "var(--color-text)",
      }}
    >
      <span className="font-medium">Тестовая сборка · альтернативный дизайн лендинга</span>
      <span className="text-[var(--color-muted)]"> · платежи и персональные данные вымышленные · </span>
      <Link href={hubHref} className="font-medium underline-offset-2 hover:underline">
        к хабу превью
      </Link>
    </div>
  );
}
