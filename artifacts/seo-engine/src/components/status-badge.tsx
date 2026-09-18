import type { ReactNode } from "react";
import type { StatusTone } from "@/lib/status-grammar";

export function StatusBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  const classes = ["statusBadge", `statusBadge--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
