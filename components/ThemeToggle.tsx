"use client";

import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const VB_W = 52;
const VB_H = 24;
const TRACK_X0 = 9;
const TRACK_X1 = 43;
const TRACK_Y = 12;
const TRACK_LEN = TRACK_X1 - TRACK_X0;

const KNOB_R_IDLE = 4.65;
const KNOB_R_DRAG = 5.35;

function themeToT(theme: "light" | "dark"): number {
  return theme === "dark" ? 1 : 0;
}

function tToPos(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: TRACK_X0 + clamped * TRACK_LEN,
    y: TRACK_Y,
  };
}

function pointerToT(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return 0;
  const p = pt.matrixTransform(ctm.inverse());
  return Math.min(1, Math.max(0, (p.x - TRACK_X0) / TRACK_LEN));
}

export function ThemeToggle() {
  const baseId = useId().replace(/:/g, "");
  const trackGradientId = `${baseId}-track`;
  const filterIdleId = `${baseId}-f-idle`;
  const filterDragId = `${baseId}-f-drag`;

  const { theme, setTheme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const detachDragRef = useRef<(() => void) | null>(null);
  const [dragT, setDragT] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      detachDragRef.current?.();
      detachDragRef.current = null;
    };
  }, []);

  const tVisual = dragT ?? themeToT(theme);
  const handle = tToPos(tVisual);
  const previewTheme = dragT !== null ? (dragT >= 0.5 ? "dark" : "light") : theme;
  const knobR = dragging ? KNOB_R_DRAG : KNOB_R_IDLE;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    e.preventDefault();
    const pointerId = e.pointerId;
    draggingRef.current = true;
    setDragging(true);
    svg.setPointerCapture(pointerId);
    setDragT(pointerToT(svg, e.clientX, e.clientY));

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      const el = svgRef.current;
      if (!el) return;
      setDragT(pointerToT(el, ev.clientX, ev.clientY));
    };

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      detach();
      draggingRef.current = false;
      setDragging(false);
      const el = svgRef.current;
      if (el) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        const tFinal = pointerToT(el, ev.clientX, ev.clientY);
        setTheme(tFinal >= 0.5 ? "dark" : "light");
      }
      setDragT(null);
    }

    const detach = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (detachDragRef.current === detach) detachDragRef.current = null;
    };

    detachDragRef.current?.();
    detachDragRef.current = detach;

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "Home") {
      e.preventDefault();
      setTheme("light");
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "End") {
      e.preventDefault();
      setTheme("dark");
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const label = "Тема: ползунок слева — светлая, справа — тёмная";
  const valueText = theme === "dark" ? "Тёмная тема" : "Светлая тема";

  return (
    <div
      role="slider"
      tabIndex={0}
      title="Слева — светлая тема, справа — тёмная. Перетащите ползунок."
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={theme === "dark" ? 1 : 0}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
      data-dragging={dragging ? "true" : "false"}
      className="theme-toggle-btn relative flex h-7 min-w-[4rem] shrink-0 cursor-grab touch-none select-none items-center justify-center gap-0.5 rounded-md border border-[var(--color-brand-gold)]/30 bg-[var(--color-bg-sides)] px-1 outline-none hover:border-[var(--color-brand-gold)]/60 hover:bg-[var(--color-brand-gold)]/10 focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] data-[dragging=true]:cursor-grabbing"
    >
      <Sun
        className={`pointer-events-none h-2.5 w-2.5 shrink-0 text-[var(--color-brand-gold)] transition-opacity duration-200 ease-out ${
          previewTheme === "light" ? "opacity-[0.92]" : "opacity-35"
        }`}
        strokeWidth={2}
        aria-hidden
      />
      <div className="relative flex flex-1 items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="theme-toggle-track-svg theme-toggle-icon block h-4 w-[2.375rem] shrink-0 text-[var(--color-brand-gold)]"
          aria-hidden
          onPointerDown={onPointerDown}
        >
          <defs>
            <linearGradient id={trackGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.5} />
            </linearGradient>
            <filter
              id={filterIdleId}
              x="-55%"
              y="-75%"
              width="210%"
              height="220%"
              colorInterpolationFilters="sRGB"
            >
              <feDropShadow dx="0" dy="1.25" stdDeviation="1.4" floodColor="#000000" floodOpacity="0.22" />
            </filter>
            <filter
              id={filterDragId}
              x="-80%"
              y="-90%"
              width="260%"
              height="260%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.35" result="blur" />
              <feFlood floodColor="#c5a572" floodOpacity="0.58" result="glowCol" />
              <feComposite in="glowCol" in2="blur" operator="in" result="glow" />
              <feDropShadow
                dx="0"
                dy="1.75"
                stdDeviation="2"
                floodColor="#000000"
                floodOpacity="0.38"
                in="SourceGraphic"
                result="lit"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="lit" />
              </feMerge>
            </filter>
          </defs>
          {/* тень под дорожкой */}
          <line
            x1={TRACK_X0}
            y1={TRACK_Y + 0.85}
            x2={TRACK_X1}
            y2={TRACK_Y + 0.85}
            stroke="#000000"
            strokeOpacity={0.12}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={TRACK_X0}
            y1={TRACK_Y}
            x2={TRACK_X1}
            y2={TRACK_Y}
            stroke={`url(#${trackGradientId})`}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={TRACK_X0}
            y1={TRACK_Y}
            x2={TRACK_X1}
            y2={TRACK_Y}
            stroke="currentColor"
            strokeOpacity={0.22}
            strokeWidth={1}
            strokeLinecap="round"
          />
          <line
            className={`theme-toggle-progress-line ${dragging ? "theme-toggle-progress-line--drag" : ""}`}
            x1={TRACK_X0}
            y1={TRACK_Y}
            x2={handle.x}
            y2={TRACK_Y}
            stroke="currentColor"
            strokeOpacity={0.72}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle
            className={`theme-toggle-knob ${dragging ? "theme-toggle-knob--drag" : ""}`}
            cx={handle.x}
            cy={handle.y}
            r={knobR}
            fill="var(--color-bg-sides)"
            stroke="currentColor"
            strokeWidth={1.15}
            filter={dragging ? `url(#${filterDragId})` : `url(#${filterIdleId})`}
          />
        </svg>
        <div
          className={`theme-toggle-knob-icon theme-toggle-icon pointer-events-none absolute flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[var(--color-brand-gold)] ${
            dragging ? "theme-toggle-knob-icon--drag" : ""
          }`}
          style={{
            left: `${(handle.x / VB_W) * 100}%`,
            top: "50%",
          }}
        >
          {previewTheme === "dark" ? (
            <Moon className="h-2 w-2" strokeWidth={2} aria-hidden />
          ) : (
            <Sun className="h-2 w-2" strokeWidth={2} aria-hidden />
          )}
        </div>
      </div>
      <Moon
        className={`pointer-events-none h-2.5 w-2.5 shrink-0 text-[var(--color-brand-gold)] transition-opacity duration-200 ease-out ${
          previewTheme === "dark" ? "opacity-[0.92]" : "opacity-35"
        }`}
        strokeWidth={1.85}
        aria-hidden
      />
    </div>
  );
}
