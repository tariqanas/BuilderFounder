import * as React from "react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", ...props }, ref) => (
    <select
      ref={ref}
      className={`w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none ${className}`}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
