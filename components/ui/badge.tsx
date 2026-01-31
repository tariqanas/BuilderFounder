import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-200 ${className}`}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge };
