"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-panel shadow-[0_16px_50px_rgba(0,0,0,.12)]", className)} {...props}>
      {children}
    </div>
  );
}

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "secondary", size = "md", children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-accent text-[#1b1814] hover:bg-[#ed9b66]",
        variant === "secondary" && "border border-line bg-panel-raised text-ink hover:border-[#465650] hover:bg-[#26312e]",
        variant === "ghost" && "text-muted hover:bg-white/[.055] hover:text-ink",
        variant === "danger" && "border border-danger/40 bg-danger/10 text-[#ef9d91] hover:bg-danger/20",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Badge({ children, tone = "neutral", className }: PropsWithChildren<{ tone?: "neutral" | "accent" | "success" | "warning" | "danger"; className?: string }>) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em]",
      tone === "neutral" && "border-line bg-white/[.035] text-muted",
      tone === "accent" && "border-accent/30 bg-accent/10 text-[#f0a676]",
      tone === "success" && "border-success/30 bg-success/10 text-[#a5c498]",
      tone === "warning" && "border-warning/30 bg-warning/10 text-[#e7c581]",
      tone === "danger" && "border-danger/35 bg-danger/10 text-[#ef9b90]",
      className,
    )}>{children}</span>
  );
}

export function SectionHeading({ eyebrow, title, action, description }: { eyebrow?: string; title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</p>}
        <h2 className="text-base font-semibold tracking-[-.02em] text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Dot({ tone = "success" }: { tone?: "success" | "warning" | "danger" | "muted" }) {
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone === "success" && "bg-success", tone === "warning" && "bg-warning", tone === "danger" && "bg-danger", tone === "muted" && "bg-dim")} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[.06]", className)} />;
}
