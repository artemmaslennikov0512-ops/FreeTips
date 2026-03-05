"use client";

import { formatMoney } from "@/lib/utils";

type Props = {
  fullName?: string | null;
  uniqueId?: string | null;
  balanceKop?: number | null;
  compact?: boolean;
  hideButtons?: boolean;
};

const CARD_STYLES = `
.premium-card {
  width: 100%;
  max-width: 320px;
}
.premium-card-inner {
  width: 100%;
  aspect-ratio: 320 / 192;
  max-height: 192px;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-navy) 25%, transparent);
}
.premium-card-face {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
}
.premium-card-front {
  background: radial-gradient(ellipse 120% 120% at 50% 50%, #d4b896 0%, var(--color-brand-gold) 40%, #b8985c 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25), inset -20px -20px 40px rgba(0,0,0,0.08);
}
.premium-card-shine {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, transparent 60%);
  pointer-events: none;
  z-index: 1;
}
.premium-dynamic-pattern {
  position: absolute;
  inset: 0;
  background: transparent;
  z-index: 0;
  opacity: 0;
}
.premium-glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.05) 100%);
  border-radius: 12px;
  z-index: 1;
}
.premium-logo-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #fff, #ccc);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #000;
  font-weight: bold;
}
.premium-card-brand {
  color: #4a4a4a;
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
}
.premium-badge {
  background: linear-gradient(90deg, #fff, #ccc);
  color: #000;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.5rem;
  font-weight: bold;
}
@media (max-width: 400px) {
  .premium-card-inner { max-height: 160px; }
}
`;

function formatCardHolder(name: string | null | undefined): string {
  if (!name || !name.trim()) return "FREE TIPS USER";
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .slice(0, 30);
}

export function PremiumCard({ fullName, balanceKop, compact }: Props) {
  const holderName = formatCardHolder(fullName);
  const showBalance = balanceKop != null;

  const graffitiSvg =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 100\"><path d=\"M40,70 Q60,30 80,70 T120,30 T160,70\" stroke=\"%23ffffff\" stroke-width=\"3\" fill=\"none\" opacity=\"0.7\"/><path d=\"M30,50 Q50,10 70,50 T110,10 T150,50\" stroke=\"%23cccccc\" stroke-width=\"2\" fill=\"none\" opacity=\"0.5\"/><text x=\"100\" y=\"85\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"Arial\" font-size=\"10\" font-weight=\"bold\" opacity=\"0.9\">FREE</text></svg>')";

  return (
    <>
      <style>{CARD_STYLES}</style>
      <div className={`flex flex-col items-center ${compact ? "gap-4" : "gap-6"}`}>
        {!compact && (
          <>
            <h2 className="text-xl font-bold text-[var(--color-on-navy)]">FreeTips Premium Service</h2>
            <p className="text-sm text-[var(--color-muted)]">Виртуальная премиальная карта в черно-белом стиле</p>
          </>
        )}
        <div className="premium-card w-full max-w-[320px]">
          <div className="premium-card-inner">
            <div className="premium-card-face premium-card-front">
              <div className="premium-dynamic-pattern" aria-hidden />
              <div className="premium-glass" aria-hidden />
              <div className="premium-card-shine" aria-hidden />
              <div
                className="absolute top-[10px] right-[12px] h-6 w-12 opacity-50 z-[2]"
                style={{ background: `${graffitiSvg} no-repeat center` }}
                aria-hidden
              />
              <div className="absolute left-[12px] bottom-[28px] z-[3] flex items-center gap-1.5">
                <div className="premium-logo-icon">FT</div>
                <span className="premium-card-brand text-xs font-extrabold">
                  FreeTips
                </span>
              </div>
              <div className="absolute left-[12px] top-[10px] z-[3]">
                <div className="premium-badge">VIRTUAL</div>
              </div>
              <div className="absolute bottom-[28px] right-[12px] z-[3] text-right">
                <p className="text-[10px] text-white/60">{showBalance ? "БАЛАНС" : "ВЛАДЕЛЕЦ"}</p>
                <p className={`text-[14px] text-white font-semibold ${showBalance ? "text-right" : "truncate max-w-[160px]"}`}>
                  {showBalance ? formatMoney(BigInt(balanceKop)) : holderName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
