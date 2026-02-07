"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Package,
  TrendingUp,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Forecasts", href: "/forecasts", icon: TrendingUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-semibold text-lg text-sidebar-foreground tracking-tight">
            Storacle
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Retail inventory tracker
          </p>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 h-9 bg-background/50 border-sidebar-border"
            />
          </div>
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
                href={item.href}
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
    </div>
  );
}
