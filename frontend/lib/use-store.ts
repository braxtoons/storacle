"use client";

import { useSearchParams } from "next/navigation";

const STORE_KEY = "storacle_selected_store";

export function useStoreName(): string {
  const searchParams = useSearchParams();
  const urlStore = searchParams.get("store");
  if (urlStore) return urlStore;
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORE_KEY) || "default";
  }
  return "default";
}
