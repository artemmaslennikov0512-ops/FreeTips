"use client";

import { useEffect } from "react";

/** Прокручивает страницу вверх при монтировании (для мобильных после редиректа). */
export function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  return null;
}
