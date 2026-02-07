import Link from "next/link";
import {
  LayoutDashboard,
  Eye,
  UtensilsCrossed,
  Lock,
  Settings,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Live Vision", href: "/", icon: Eye, active: true },
  { label: "Menu Engineering", href: "/", icon: UtensilsCrossed },
  { label: "Predictive Reorders", href: "/", icon: Lock },
  { label: "Settings", href: "/", icon: Settings },
];

const stockoutItems = [
  { label: "Lettuce", status: "OUT BY 7:15 PM", variant: "destructive" as const },
  { label: "Stable", status: "Low by 18:00 PM", variant: "warning" as const },
  { label: "Flair", status: "Low by 16:18 PM", variant: "success" as const },
];

function StockoutGauge({
  label,
  status,
  variant,
  fillPercent,
}: {
  label: string;
  status: string;
  variant: "destructive" | "warning" | "success";
  fillPercent: number;
}) {
  const variantStyles = {
    destructive: "bg-red-500 text-red-950",
    warning: "bg-amber-500 text-amber-950",
    success: "bg-emerald-500 text-emerald-950",
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 rounded-full transition-all",
            variant === "destructive" && "bg-red-500",
            variant === "warning" && "bg-amber-500",
            variant === "success" && "bg-emerald-500"
          )}
          style={{ height: `${fillPercent}%` }}
        />
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          variantStyles[variant]
        )}
      >
        {status}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-semibold text-lg text-sidebar-foreground">
            Storacle
          </h1>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 h-9 bg-background/50 border-sidebar-border"
            />
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  item.active
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

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              System Live
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">
              Cam 02: Walk-in Cooler
            </span>
            <span className="text-sm text-muted-foreground">
              Cam 01: Dry Storage
            </span>
          </div>
          <div className="text-sm text-muted-foreground tabular-nums">
            {timeStr} · {dateStr}
          </div>
        </header>

        {/* 2x2 grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 overflow-auto">
          {/* Live CV Feed */}
          <Card className="flex flex-col border-border bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live CV Feed</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-[200px] p-0">
              <div className="relative flex-1 min-h-[240px] bg-muted/30 rounded-b-xl overflow-hidden">
                {/* Placeholder for live feed image */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 to-zinc-900 flex items-center justify-center">
                  <div className="text-center text-muted-foreground text-sm">
                    Live feed placeholder
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-sm text-white">
                  Tomatoes: 14 units detected (98% confidence)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consumption & Sales */}
          <Card className="flex flex-col border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consumption & Sales</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px] flex flex-col">
              <div className="flex-1 min-h-[160px] flex items-center justify-center bg-muted/20 rounded-lg">
                {/* Placeholder chart - simple line representation */}
                <svg
                  viewBox="0 0 200 100"
                  className="w-full h-full max-h-[140px] text-chart-1"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points="0,80 40,60 80,70 120,40 160,50 200,20"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                42 Signature Burgers sold in the last hours
              </p>
            </CardContent>
          </Card>

          {/* Stockout Countdown */}
          <Card className="flex flex-col border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stockout Countdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around gap-4">
                <StockoutGauge
                  label="Lettuce"
                  status="OUT BY 7:15 PM"
                  variant="destructive"
                  fillPercent={92}
                />
                <StockoutGauge
                  label="Stable"
                  status="Low by 18:00 PM"
                  variant="warning"
                  fillPercent={55}
                />
                <StockoutGauge
                  label="Flair"
                  status="Low by 16:18 PM"
                  variant="success"
                  fillPercent={25}
                />
              </div>
            </CardContent>
          </Card>

          {/* Automated Reorder Action */}
          <Card className="flex flex-col border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Automated Reorder Action</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm">
                Reorder suggested: <strong>5 Crates of Tomatoes</strong>
              </p>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Send Order to &quot;Local Farms Inc.&quot;
              </Button>
              <p className="text-xs text-muted-foreground">
                Lost revenue if not ordered: <span className="text-destructive font-medium">$450</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
