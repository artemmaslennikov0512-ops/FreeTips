"use client";

import { useEffect } from "react";

/** Устанавливает CSS-переменные для эффекта сетки, следующей за курсором. */
export function GridCursorEffect() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      targetX = x;
      targetY = y;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      document.documentElement.style.setProperty("--grid-offset-x", `${currentX}px`);
      document.documentElement.style.setProperty("--grid-offset-y", `${currentY}px`);
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMove, { passive: true });
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
