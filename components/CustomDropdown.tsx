"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

export type CustomDropdownVariant = "admin" | "establishment" | "default";

export interface CustomDropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: CustomDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  describedBy?: string;
  variant?: CustomDropdownVariant;
  className?: string;
  /** Optional: trigger class name (for width/size overrides) */
  triggerClassName?: string;
}

const variantStyles = {
  admin: {
    wrap: "custom-dropdown-admin rounded-xl border-0 overflow-visible",
    trigger:
      "custom-dropdown-trigger-admin cabinet-section-header w-full flex items-center justify-between gap-2 rounded-xl border-0 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer",
    panel:
      "custom-dropdown-panel custom-dropdown-panel-admin absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/10 bg-[#0a192f] shadow-xl overflow-hidden",
    option: "w-full flex items-center px-4 py-3 text-left text-sm font-medium transition-colors text-white/90 hover:bg-white/10",
    optionSelected: "bg-[var(--color-brand-gold)] text-[#0a192f] hover:bg-[var(--color-brand-gold)]/90",
  },
  establishment: {
    wrap: "custom-dropdown-establishment rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 overflow-visible focus-within:ring-1 focus-within:ring-[var(--color-brand-gold)]/40",
    trigger:
      "custom-dropdown-trigger-establishment w-full flex items-center justify-between gap-2 rounded-[10px] border-0 bg-transparent pl-4 pr-10 py-3 text-white focus:outline-none cursor-pointer text-left",
    panel:
      "custom-dropdown-panel custom-dropdown-panel-establishment absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[#1e2a3a] shadow-xl overflow-hidden",
    option: "w-full flex items-center px-4 py-3 text-left text-sm font-medium transition-colors text-white/90 hover:bg-white/10",
    optionSelected: "bg-[var(--color-brand-gold)]/20 text-white hover:bg-[var(--color-brand-gold)]/30",
  },
  default: {
    wrap: "custom-dropdown-default rounded-xl border border-[var(--color-brand-gold)]/25 bg-[var(--color-light-gray)] overflow-visible focus-within:border-[var(--color-brand-gold)]/50 focus-within:ring-2 focus-within:ring-[var(--color-brand-gold)]/30 focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-bg)]",
    trigger:
      "custom-dropdown-trigger-default w-full flex items-center justify-between gap-2 rounded-xl border-0 bg-transparent py-2.5 pl-4 pr-10 text-left text-[var(--color-text)] focus:outline-none font-[family:var(--font-inter)] text-base cursor-pointer",
    panel:
      "custom-dropdown-panel custom-dropdown-panel-default absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] shadow-[var(--shadow-card)] overflow-hidden",
    option: "w-full flex items-center px-4 py-3 text-left text-sm font-medium transition-colors text-[var(--color-text)]/90 hover:bg-[var(--color-light-gray)]",
    optionSelected: "bg-[#0a192f] text-white hover:bg-[#0a192f]/90",
  },
};

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Выберите…",
  label,
  id,
  describedBy,
  variant = "default",
  className = "",
  triggerClassName,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  const styles = variantStyles[variant];
  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={ref} className={`custom-dropdown relative ${styles.wrap} ${className}`}>
      {label && (
        <label
          id={id ? `${id}-label` : undefined}
          htmlFor={id}
          className={`mb-1.5 block text-sm font-medium ${variant === "admin" || variant === "establishment" ? "text-white/90" : "text-[var(--color-text)]"}`}
        >
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label && id ? `${id}-label` : undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && value ? `${id}-option-${value}` : undefined}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div
        role="listbox"
        aria-labelledby={label && id ? `${id}-label` : undefined}
        id={id ? `${id}-listbox` : undefined}
        className={`${styles.panel} transition-[opacity,transform] duration-200 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none invisible"
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            id={id ? `${id}-option-${opt.value}` : undefined}
            aria-selected={value === opt.value}
            onClick={() => {
              onChange(opt.value);
              close();
            }}
            className={`${styles.option} ${value === opt.value ? styles.optionSelected : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
