"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, AlertTriangle, Loader2 } from "lucide-react";
import {
  getForecastableProducts,
  getForecast,
  type ForecastResult,
  ApiError,
} from "@/lib/api";
import { useStoreName } from "@/lib/use-store";

function formatProductLabel(productType: string): string {
  return productType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stockoutRisk(
  f: ForecastResult
): "high" | "medium" | "low" | "ok" {
  const daysToRestock = f.restock_day_median ?? 999;
  if (daysToRestock <= 1) return "high";
  if (daysToRestock <= 3) return "medium";
  if (daysToRestock <= 7) return "low";
  return "ok";
}

function downloadReorderCsv(items: ForecastResult[]) {
  const headers = ["Product", "Suggested order (units)", "Order by", "Confidence"];
  const rows = items.map((f) => [
    formatProductLabel(f.product_type),
    String(Math.ceil(f.predicted_stock_needed)),
    f.restock_date_median,
    f.restock_confidence_level != null
      ? `${(f.restock_confidence_level * 100).toFixed(0)}%`
      : "",
  ]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reorder-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ForecastsPage() {
  const storeName = useStoreName();
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReorderSuccess, setShowReorderSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { product_types } = await getForecastableProducts(storeName);
        if (cancelled) return;
        setProductTypes(product_types);
        const horizon = 14;
        const results: ForecastResult[] = [];
        for (const pt of product_types) {
          try {
            const f = await getForecast(pt, { storeName, horizon });
            if (cancelled) return;
            results.push(f);
          } catch {
            // skip products that fail (e.g. race with DB)
          }
        }
        if (cancelled) return;
        setForecasts(results);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load forecasts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [storeName]);

  const highRiskForecasts = forecasts.filter((f) => stockoutRisk(f) === "high");
  const reorderItems = forecasts
    .filter((f) => (f.restock_day_median ?? 999) < 14)
    .sort(
      (a, b) =>
        (a.restock_day_median ?? 999) - (b.restock_day_median ?? 999)
    );

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="text-lg font-semibold">Forecasts & reorder</h2>
        <p className="text-sm text-muted-foreground">
          Stockout prediction and reorder timing
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="forecast" className="w-full">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="forecast" className="gap-2">
              <TrendingUp className="size-4" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="reorder" className="gap-2">
              <Package className="size-4" />
              Reorder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="mt-6 space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  Demand forecast
                </CardTitle>
                <CardDescription>
                  Predicted usage and stockout risk from AM/EOD deltas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="size-5 animate-spin" />
                    Loading forecasts…
                  </div>
                ) : forecasts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                    {productTypes.length === 0
                      ? "No products have enough history yet for the selected store. Add at least 2 days of AM and EOD snapshots per product to see forecasts. If you ran the seed script, ensure the \"default\" store is selected in the sidebar."
                      : "No forecast data available for the listed products."}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {forecasts.map((f) => {
                        const avgDaily =
                          f.predicted_demand_per_day.length > 0
                            ? f.predicted_demand_per_day.reduce(
                                (a, b) => a + b,
                                0
                              ) / f.predicted_demand_per_day.length
                            : 0;
                        const risk = stockoutRisk(f);
                        const restockDays = f.restock_day_median ?? null;
                        return (
                          <div
                            key={f.product_type}
                            className="rounded-lg border border-border bg-muted/20 p-4"
                          >
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {formatProductLabel(f.product_type)}
                            </p>
                            <p className="text-2xl font-semibold mt-1">
                              ~{avgDaily.toFixed(1)} / day
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Current stock: {f.current_inventory} · Est.
                              restock in{" "}
                              {restockDays != null
                                ? `${restockDays.toFixed(0)} days`
                                : "—"}
                            </p>
                            {risk === "high" && (
                              <Badge variant="destructive" className="mt-2">
                                High risk
                              </Badge>
                            )}
                            {risk === "medium" && (
                              <Badge
                                className="mt-2 bg-amber-500/20 text-amber-foreground border-amber-500/30"
                              >
                                Restock soon
                              </Badge>
                            )}
                            {risk === "ok" && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Healthy stock
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                      Restock dates use an 80% confidence interval (exponential
                      smoothing on daily demand). Horizon: {forecasts[0]?.horizon_days ?? 14} days.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  Stockout risk
                </CardTitle>
                <CardDescription>
                  Items likely to run out soon based on current rate of use.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : highRiskForecasts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {forecasts.length === 0
                      ? "No forecast data yet."
                      : "No items in high stockout risk right now."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {highRiskForecasts.map((f) => (
                      <li
                        key={f.product_type}
                        className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3"
                      >
                        <span>
                          {formatProductLabel(f.product_type)}
                        </span>
                        <Badge variant="destructive">
                          Restock by {f.restock_date_median}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reorder" className="mt-6 space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Reorder timing
                </CardTitle>
                <CardDescription>
                  When to reorder to avoid stockouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : reorderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {forecasts.length === 0
                      ? "No forecast data yet. Add AM/EOD snapshots to see reorder suggestions."
                      : "No items need reordering within the forecast horizon."}
                  </p>
                ) : (
                  <>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left font-medium p-3">
                              Product
                            </th>
                            <th className="text-right font-medium p-3">
                              Suggest order
                            </th>
                            <th className="text-right font-medium p-3">
                              Order by
                            </th>
                            <th className="text-right font-medium p-3">
                              Confidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reorderItems.map((f) => (
                            <tr
                              key={f.product_type}
                              className="border-b border-border"
                            >
                              <td className="p-3">
                                {formatProductLabel(f.product_type)}
                              </td>
                              <td className="p-3 text-right tabular-nums">
                                ~{Math.ceil(f.predicted_stock_needed)} units
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                {f.restock_date_median}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                {f.restock_confidence_level != null
                                  ? `${(f.restock_confidence_level * 100).toFixed(0)}%`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
<<<<<<< HEAD
                      onClick={() => setShowReorderSuccess(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Create reorder
=======
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => downloadReorderCsv(reorderItems)}
                    >
                      Download reorder CSV
>>>>>>> 02d64c4 (Added Reorder Functionality)
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showReorderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-center text-foreground">
              Success! <strong>{storeName}</strong> inventory.csv has been sent
              to your email address.
            </p>
            <Button
              onClick={() => setShowReorderSuccess(false)}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
