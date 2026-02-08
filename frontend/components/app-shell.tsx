"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Upload,
  Package,
  TrendingUp,
  Plus,
  X,
  Store as StoreIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStores, addStore, deleteStore, type Store } from "@/lib/api";

const STORE_KEY = "storacle_selected_store";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Forecasts", href: "/forecasts", icon: TrendingUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("default");
  const [newStoreName, setNewStoreName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);

  // Initialize selected store from URL > localStorage > "default"
  useEffect(() => {
    const urlStore = searchParams.get("store");
    if (urlStore) {
      setSelectedStore(urlStore);
      localStorage.setItem(STORE_KEY, urlStore);
    } else {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        setSelectedStore(saved);
      }
    }
  }, [searchParams]);

  // Fetch stores on mount
  useEffect(() => {
    getStores()
      .then(setStores)
      .catch(() => {});
  }, []);

  function handleStoreChange(name: string) {
    setSelectedStore(name);
    localStorage.setItem(STORE_KEY, name);
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", name);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newStoreName.trim();
    if (!trimmed) return;
    setAddError(null);
    try {
      const created = await addStore(trimmed);
      setStores((prev) => [...prev, created]);
      setNewStoreName("");
      handleStoreChange(created.name);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add store");
    }
  }

  function handleDeleteStore(store: Store) {
    setConfirmDelete(store);
  }

  async function confirmDeleteStore() {
    if (!confirmDelete) return;
    try {
      await deleteStore(confirmDelete.id);
      setStores((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      if (selectedStore === confirmDelete.name) {
        handleStoreChange("default");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete store");
    } finally {
      setConfirmDelete(null);
    }
  }

  function navHref(base: string) {
    return `${base}?store=${encodeURIComponent(selectedStore)}`;
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Image
              src="/storacle.png"
              alt="Storacle"
              width={55}
              height={55}
              className="shrink-0 size-[55px] object-contain"
            />
            <h1 className="font-semibold text-lg text-sidebar-foreground tracking-tight">
              Storacle
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Retail inventory tracker
          </p>
        </div>

        {/* Store selector */}
        <div className="p-3 border-b border-sidebar-border space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <StoreIcon className="size-3" />
            Store
          </label>
          <select
            value={selectedStore}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="w-full h-8 rounded-md border border-sidebar-border bg-background/50 px-2 text-sm text-foreground"
          >
            {stores.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Add store */}
          <form onSubmit={handleAddStore} className="flex gap-1">
            <Input
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="New store..."
              className="h-7 text-xs bg-background/50 border-sidebar-border"
            />
            <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <Plus className="size-3" />
            </Button>
          </form>
          {addError && (
            <p className="text-xs text-destructive">{addError}</p>
          )}

          {/* Remove non-default stores */}
          {stores.filter((s) => s.name !== "default").length > 0 && (
            <div className="space-y-1">
              {stores
                .filter((s) => s.name !== "default")
                .map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span className="truncate">{s.name}</span>
                    <button
                      onClick={() => handleDeleteStore(s)}
                      className="hover:text-destructive shrink-0 p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={navHref(item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </main>

      {/* Delete store confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-foreground">Delete store?</h3>
            <p className="text-sm text-muted-foreground">
              {(confirmDelete.snapshot_count ?? 0) > 0
                ? `This store has ${confirmDelete.snapshot_count} snapshot(s). Deleting will permanently remove the store and all its data. Are you sure?`
                : `Delete store "${confirmDelete.name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDeleteStore}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
