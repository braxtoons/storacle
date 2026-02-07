"use client";

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
import { TrendingUp, Package, AlertTriangle } from "lucide-react";

export default function ForecastsPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="text-lg font-semibold">Forecasts & reorder</h2>
        <p className="text-sm text-muted-foreground">
          Stockout prediction and reorder timing
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto space-y-6">
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
                  Predicted usage and stockout risk from AM/EOD deltas. NCR
                  Voyix alignment: stockout prediction.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Canned tomatoes
                    </p>
                    <p className="text-2xl font-semibold mt-1">~12 / day</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. stockout in 3.5 days
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Canned beans
                    </p>
                    <p className="text-2xl font-semibold mt-1">~6 / day</p>
                    <Badge variant="destructive" className="mt-2">
                      High risk
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Soup
                    </p>
                    <p className="text-2xl font-semibold mt-1">~4 / day</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Healthy stock
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                  Chart placeholder: demand trend over next 7 days (backend
                  integration pending).
                </div>
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
                <ul className="space-y-2">
                  <li className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
                    <span>Canned beans</span>
                    <Badge variant="destructive">Out by EOD tomorrow</Badge>
                  </li>
                  <li className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
                    <span>Canned tomatoes</span>
                    <Badge className="bg-amber-500/20 text-amber-foreground border-amber-500/30">
                      Low in ~4 days
                    </Badge>
                  </li>
                </ul>
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
                  When to reorder to avoid stockouts. NCR Voyix: reorder timing
                  and suggested quantities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left font-medium p-3">Product</th>
                        <th className="text-right font-medium p-3">
                          Suggest order
                        </th>
                        <th className="text-right font-medium p-3">
                          Order by
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-3">Canned beans</td>
                        <td className="p-3 text-right tabular-nums">
                          2 cases
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          Today
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-3">Canned tomatoes</td>
                        <td className="p-3 text-right tabular-nums">
                          5 cases
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          Within 2 days
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Create reorder (placeholder)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Est. lost revenue if not ordered:{" "}
                  <span className="text-destructive font-medium">$450</span>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
