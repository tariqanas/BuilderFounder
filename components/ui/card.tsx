import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-6 ${className}`}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { Card };
