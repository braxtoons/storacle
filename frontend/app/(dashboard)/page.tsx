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
import {
  getSnapshots,
  getForecastableProducts,
  getForecast,
  type Snapshot,
  type ForecastResult,
} from "@/lib/api";

function formatProductLabel(productType: string): string {
  return productType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stockoutVariant(
  restockDays: number
): "destructive" | "warning" | "success" {
  if (restockDays <= 1) return "destructive";
  if (restockDays <= 4) return "warning";
  return "success";
}

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
          style={{ height: `${Math.min(100, Math.max(5, fillPercent))}%` }}
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
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    getSnapshots()
      .then(setSnapshots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getForecastableProducts()
      .then(({ product_types }) => Promise.all(
        product_types.slice(0, 5).map((pt) => getForecast(pt, { horizon: 14 }))
      ))
      .then((results) => {
        if (!cancelled) setForecasts(results);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setForecastLoading(false);
      });
    return () => { cancelled = true; };
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
            {forecastLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading forecast…
              </div>
            ) : forecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Add at least 2 days of AM and EOD snapshots per product to see stockout forecast.
              </p>
            ) : (
              <div className="flex justify-around gap-4">
                {forecasts.slice(0, 3).map((f) => {
                  const days = f.restock_day_median ?? 99;
                  const variant = stockoutVariant(days);
                  const status =
                    days <= 1
                      ? `Restock by ${f.restock_date_median}`
                      : days <= 4
                        ? `Low in ~${days.toFixed(0)} days`
                        : "OK";
                  const fillPercent = days <= 1 ? 95 : days <= 4 ? 50 : 20;
                  return (
                    <StockoutGauge
                      key={f.product_type}
                      label={formatProductLabel(f.product_type)}
                      status={status}
                      variant={variant}
                      fillPercent={fillPercent}
                    />
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              From /forecast (exponential smoothing on AM/EOD demand)
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suggested reorder</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {forecastLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : forecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reorder suggestion yet. Add AM/EOD history to see forecasts.
              </p>
            ) : (
              <>
                {(() => {
                  const soonest = [...forecasts]
                    .filter((f) => (f.restock_day_median ?? 99) < 14)
                    .sort(
                      (a, b) =>
                        (a.restock_day_median ?? 99) - (b.restock_day_median ?? 99)
                    )[0];
                  if (!soonest) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No urgent reorder. Stock levels look good within the forecast horizon.
                      </p>
                    );
                  }
                  return (
                    <p className="text-sm">
                      Reorder suggested:{" "}
                      <strong>
                        ~{Math.ceil(soonest.predicted_stock_needed)} units{" "}
                        {formatProductLabel(soonest.product_type)}
                      </strong>{" "}
                      by {soonest.restock_date_median}
                    </p>
                  );
                })()}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                  <a href="/forecasts">Create reorder (Forecasts)</a>
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Restock dates from forecast API (80% confidence interval).
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
