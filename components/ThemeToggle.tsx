"use client";

import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const VB_W = 56;
const VB_H = 30;
const CX = 28;
const CY = 26;
const R = 16;

function themeToT(theme: "light" | "dark"): number {
  return theme === "dark" ? 1 : 0;
}

function tToPos(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const angle = Math.PI * (1 - clamped);
  return {
    x: CX + R * Math.cos(angle),
    y: CY - R * Math.sin(angle),
  };
}

function pointerToT(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return 0;
  const p = pt.matrixTransform(ctm.inverse());

  if (p.y >= CY) {
    return Math.min(1, Math.max(0, (p.x - (CX - R)) / (2 * R)));
  }

  const a = Math.atan2(CY - p.y, p.x - CX);
  const clamped = Math.min(Math.PI, Math.max(0, a));
  return 1 - clamped / Math.PI;
}

export function ThemeToggle() {
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
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setTheme("light");
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setTheme("dark");
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const label = "Тема оформления: перетащите по дуге от рассвета к закату";
  const valueText = theme === "dark" ? "Тёмная тема" : "Светлая тема";

  return (
    <div
      role="slider"
      tabIndex={0}
      title="Перетащите по дуге: слева — светлая тема, справа — тёмная"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={theme === "dark" ? 1 : 0}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
      data-dragging={dragging ? "true" : "false"}
      className="theme-toggle-btn relative flex h-9 w-[3.25rem] shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--color-bg-sides)] outline-none transition-[border-color,background-color] duration-200 hover:border-[var(--color-brand-gold)]/60 hover:bg-[var(--color-brand-gold)]/10 focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] data-[dragging=true]:cursor-grabbing"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="theme-toggle-icon block h-7 w-[52px] text-[var(--color-brand-gold)]"
        aria-hidden
        onPointerDown={onPointerDown}
      >
        <line
          x1={CX - R}
          y1={CY}
          x2={CX + R}
          y2={CY}
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
        <circle
          cx={handle.x}
          cy={handle.y}
          r={5.5}
          fill="var(--color-bg-sides)"
          stroke="currentColor"
          strokeWidth={1.25}
        />
      </svg>
      <div
        className="theme-toggle-icon pointer-events-none absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[var(--color-brand-gold)]"
        style={{
          left: `${(handle.x / VB_W) * 100}%`,
          top: `${(handle.y / VB_H) * 100}%`,
        }}
      >
        {previewTheme === "dark" ? (
          <Moon className="h-3 w-3" strokeWidth={2} aria-hidden />
        ) : (
          <Sun className="h-3 w-3" strokeWidth={2.25} aria-hidden />
        )}
      </div>
    </div>
  );
}
