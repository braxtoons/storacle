import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">
            Today&apos;s overview
          </span>
        </div>
        <div className="text-sm text-muted-foreground tabular-nums">
          {timeStr} · {dateStr}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 overflow-auto">
        <Card className="flex flex-col border-border bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Snapshot feed</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-[200px] p-0">
            <div className="relative flex-1 min-h-[240px] bg-muted/30 rounded-b-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 to-zinc-900 flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sm">
                  AM / EOD snapshot placeholder
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-sm text-white">
                Canned goods: 24 units (last count)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily usage</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px] flex flex-col">
            <div className="flex-1 min-h-[160px] flex items-center justify-center bg-muted/20 rounded-lg">
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
              Demand trend from AM → EOD deltas
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stockout countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around gap-4">
              <StockoutGauge
                label="Canned beans"
                status="OUT BY 7:15 PM"
                variant="destructive"
                fillPercent={92}
              />
              <StockoutGauge
                label="Tomatoes"
                status="Low by 18:00"
                variant="warning"
                fillPercent={55}
              />
              <StockoutGauge
                label="Soup"
                status="OK"
                variant="success"
                fillPercent={25}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suggested reorder</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">
              Reorder suggested: <strong>5 cases canned tomatoes</strong>
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Create reorder (Forecasts)
            </Button>
            <p className="text-xs text-muted-foreground">
              Est. lost revenue if not ordered:{" "}
              <span className="text-destructive font-medium">$450</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
