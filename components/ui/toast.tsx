import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";

export const ToastProvider = ToastPrimitives.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={`fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-3 p-4 sm:bottom-2 sm:right-2 ${className}`}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={`relative flex w-full items-start justify-between gap-4 rounded-2xl border border-emerald-400/30 bg-slate-900/95 p-4 text-slate-100 shadow-lg ${className}`}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={`text-sm font-semibold text-white ${className}`}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={`text-xs text-slate-300 ${className}`}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={`rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-200 hover:border-emerald-300 ${className}`}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className = "", ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={`absolute right-2 top-2 rounded-full border border-transparent px-2 py-1 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white ${className}`}
    {...props}
  >
    ✕
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
export type ToastActionElement = React.ReactElement<typeof ToastAction>;
