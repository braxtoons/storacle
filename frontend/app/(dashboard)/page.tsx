"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { getSnapshots, type Snapshot } from "@/lib/api";

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

function totalUnits(snap: Snapshot): number {
  return (snap.counts ?? []).reduce((sum, c) => sum + c.count, 0);
}

function sameCalendarDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSnapshots()
      .then(setSnapshots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const latest = snapshots[0] ?? null;

  // Find AM + EOD pair for the same calendar day to compute daily delta
  let dailyDelta: number | null = null;
  let deltaLabel = "Need AM + EOD data for the same day";
  if (snapshots.length >= 2) {
    for (const snap of snapshots) {
      const paired = snapshots.find(
        (s) =>
          s.id !== snap.id &&
          sameCalendarDay(s.timestamp, snap.timestamp) &&
          s.time_of_day !== snap.time_of_day
      );
      if (paired) {
        const am = snap.time_of_day === "AM" ? snap : paired;
        const eod = snap.time_of_day === "EOD" ? snap : paired;
        dailyDelta = totalUnits(am) - totalUnits(eod);
        const day = new Date(am.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        deltaLabel = `${day}: ${dailyDelta} units used (AM ${totalUnits(am)} → EOD ${totalUnits(eod)})`;
        break;
      }
    }
  }

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
                {loading ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : latest ? (
                  <div className="text-center text-white text-sm space-y-1 px-4">
                    <p className="font-medium">Snapshot #{latest.id} — {latest.time_of_day}</p>
                    <p className="text-muted-foreground text-xs">
                      {latest.store_name ?? "default"} · {new Date(latest.timestamp).toLocaleString()}
                    </p>
                    {latest.counts && latest.counts.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {latest.counts.map((c, i) => (
                          <span key={`${c.product_type}-${i}`} className="rounded bg-white/10 px-2 py-0.5 text-xs">
                            {c.product_type.replace(/_/g, " ")}: {c.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    No snapshots yet
                  </div>
                )}
              </div>
              {latest && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-sm text-white">
                  Total: {totalUnits(latest)} units ({latest.counts?.length ?? 0} product types)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily usage</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px] flex flex-col">
            <div className="flex-1 min-h-[160px] flex items-center justify-center bg-muted/20 rounded-lg">
              {loading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : dailyDelta !== null ? (
                <div className="text-center space-y-2">
                  <p className="text-4xl font-bold tabular-nums">{dailyDelta}</p>
                  <p className="text-sm text-muted-foreground">units consumed today</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-4 text-center">
                  {deltaLabel}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {dailyDelta !== null ? deltaLabel : "Demand trend from AM → EOD deltas"}
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
            <p className="text-xs text-muted-foreground text-center mt-3">
              Placeholder — will use /forecast endpoint
            </p>
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
            <p className="text-xs text-muted-foreground">
              Placeholder — will use /forecast endpoint
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
