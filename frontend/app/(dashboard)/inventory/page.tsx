"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Loader2 } from "lucide-react";
import { getSnapshots, type Snapshot } from "@/lib/api";

function StatusBadge({ status }: { status: "ok" | "low" | "out" }) {
  if (status === "ok")
    return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-foreground border-emerald-500/30">OK</Badge>;
  if (status === "low")
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-foreground border-amber-500/30">Low</Badge>;
  return <Badge variant="destructive">Out</Badge>;
}

function deriveStatus(count: number): "ok" | "low" | "out" {
  if (count === 0) return "out";
  if (count < 10) return "low";
  return "ok";
}

export default function InventoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSnapshots()
      .then(setSnapshots)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const latestCounts = snapshots[0]?.counts ?? [];

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Latest counts from snapshots
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" />
            Loading inventory…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Current inventory
                </CardTitle>
                <CardDescription>
                  {latestCounts.length > 0
                    ? `From snapshot #${snapshots[0].id} — ${snapshots[0].time_of_day} · ${new Date(snapshots[0].timestamp).toLocaleString()}`
                    : "No snapshots yet. Use Upload to add AM or EOD photos."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestCounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestCounts.map((row, i) => (
                        <TableRow key={`${row.product_type}-${i}`}>
                          <TableCell className="font-medium">
                            {row.product_type.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.count}
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusBadge status={deriveStatus(row.count)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    No inventory data yet. Upload a snapshot to get started.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Snapshot history</CardTitle>
                <CardDescription>
                  Recent AM and EOD snapshots
                </CardDescription>
              </CardHeader>
              <CardContent>
                {snapshots.length > 0 ? (
                  <div className="space-y-3">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="rounded-lg border border-border bg-muted/20 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            Snapshot #{snap.id} — {snap.time_of_day}
                          </span>
                          <span className="text-muted-foreground">
                            {snap.store_name ?? "default"} · {new Date(snap.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {snap.counts && snap.counts.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {snap.counts.map((c, i) => (
                              <span
                                key={`${c.product_type}-${i}`}
                                className="rounded-md bg-muted px-2 py-1 text-xs"
                              >
                                {c.product_type.replace(/_/g, " ")}: {c.count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No counts</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    No snapshots yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
