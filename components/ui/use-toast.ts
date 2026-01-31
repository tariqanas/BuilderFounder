import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToastState = {
  toasts: ToastItem[];
};

type ToastItem = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type ToastActionType =
  | { type: "ADD_TOAST"; toast: ToastItem }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastItem> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 800;

let count = 0;

const generateId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
};

const toastStore: ToastState = { toasts: [] };
const listeners: Array<(state: ToastState) => void> = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener(toastStore));
};

const reducer = (state: ToastState, action: ToastActionType) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toastId || !action.toastId
            ? { ...toast, open: false }
            : toast,
        ),
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: action.toastId
          ? state.toasts.filter((toast) => toast.id !== action.toastId)
          : [],
      };
    default:
      return state;
  }
};

const dispatch = (action: ToastActionType) => {
  Object.assign(toastStore, reducer(toastStore, action));
  notifyListeners();
};

const addToRemoveQueue = (toastId: string) => {
  setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
};

export const toast = ({ ...props }: Omit<ToastItem, "id">) => {
  const id = generateId();

  const update = (props: ToastItem) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismiss();
        }
      },
    },
  });

  return { id, dismiss, update };
};

export const useToast = () => {
  const [state, setState] = React.useState<ToastState>(toastStore);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  React.useEffect(() => {
    state.toasts.forEach((toastItem) => {
      if (toastItem.open === false) {
        addToRemoveQueue(toastItem.id);
      }
    });
  }, [state.toasts]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
  };
};
