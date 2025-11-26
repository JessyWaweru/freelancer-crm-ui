"use client";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import React from "react";

export const Toaster: React.FC = () => <SonnerToaster position="top-right" richColors closeButton />;

// Explicit type to force TS
type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "warning" | "custom";
};

export function useToast() {
  return {
    toast: sonnerToast as (options: ToastOptions) => void,
  };
}

