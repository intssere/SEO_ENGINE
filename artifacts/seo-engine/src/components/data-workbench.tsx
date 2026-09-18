import type { ReactNode } from "react";

export function DataWorkbench({
  label,
  controls,
  meta,
  children,
  footer,
}: {
  label: string;
  controls?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="dataWorkbench" aria-label={label}>
      {(controls || meta) && (
        <div className="dataWorkbenchToolbar">
          <div className="dataWorkbenchControls">{controls}</div>
          <div className="dataWorkbenchMeta" aria-live="polite">
            {meta}
          </div>
        </div>
      )}
      <div className="dataWorkbenchBody">{children}</div>
      {footer ? <div className="dataWorkbenchFooter">{footer}</div> : null}
    </section>
  );
}
