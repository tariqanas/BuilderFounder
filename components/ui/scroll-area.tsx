import * as React from "react";

export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`overflow-y-auto pr-2 ${className}`}
      {...props}
    />
  ),
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
