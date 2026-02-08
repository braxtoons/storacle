"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Loader2, Pencil, X, Check, Plus } from "lucide-react";
import {
  getSnapshots,
  getLatestEod,
  editSnapshotCounts,
  type Snapshot,
} from "@/lib/api";
import { useStoreName } from "@/lib/use-store";

function StatusBadge({ status }: { status: "ok" | "low" | "out" }) {
  if (status === "ok")
    return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-foreground border-emerald-500/30">OK</Badge>;
  if (status === "low")
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-foreground border-amber-500/30">Low</Badge>;
  return <Badge variant="destructive">Out</Badge>;
}

function ConfidenceBadge({ confidence }: { confidence?: string }) {
  const level = (confidence || "medium").toLowerCase();
  if (level === "high")
    return <span className="text-xs font-medium text-emerald-400">High</span>;
  if (level === "low")
    return <span className="text-xs font-medium text-red-400">Low</span>;
  return <span className="text-xs font-medium text-amber-400">Medium</span>;
}

function deriveStatus(count: number): "ok" | "low" | "out" {
  if (count === 0) return "out";
  if (count < 10) return "low";
  return "ok";
}

interface EditRow {
  product_type: string;
  count: number;
  isNew?: boolean;
}

export default function InventoryPage() {
  const storeName = useStoreName();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [latestEod, setLatestEod] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getSnapshots(storeName),
      getLatestEod(storeName),
    ])
      .then(([snaps, eod]) => {
        setSnapshots(snaps);
        setLatestEod(eod);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [storeName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const eodCounts = latestEod?.counts ?? [];

  function startEdit(snap: Snapshot) {
    setEditingId(snap.id);
    setEditRows(
      (snap.counts ?? []).map((c) => ({
        product_type: c.product_type,
        count: c.count,
      }))
    );
    setEditError(null);
    setNewProductName("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRows([]);
    setEditError(null);
    setNewProductName("");
  }

  function updateEditRow(index: number, count: number) {
    setEditRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, count } : r))
    );
  }

  function addEditRow() {
    const name = newProductName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return;
    if (editRows.some((r) => r.product_type === name)) return;
    setEditRows((prev) => [...prev, { product_type: name, count: 0, isNew: true }]);
    setNewProductName("");
  }

  function removeEditRow(index: number) {
    setEditRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveEdit() {
    if (editingId === null) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await editSnapshotCounts(
        editingId,
        editRows.map((r) => ({ product_type: r.product_type, count: r.count }))
      );
      setEditingId(null);
      setEditRows([]);
      fetchData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

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
            {/* Current inventory from latest EOD */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Current inventory
                </CardTitle>
                <CardDescription>
                  {eodCounts.length > 0 && latestEod
                    ? `From latest EOD snapshot #${latestEod.id} — ${new Date(latestEod.timestamp).toLocaleString()}`
                    : "No EOD snapshots yet. Upload an EOD photo to see current inventory."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eodCounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eodCounts.map((row, i) => (
                        <TableRow key={`${row.product_type}-${i}`}>
                          <TableCell className="font-medium">
                            {row.product_type.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.count}
                          </TableCell>
                          <TableCell className="text-right">
                            <ConfidenceBadge confidence={row.confidence_score} />
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
                    No EOD inventory data yet. Upload an end-of-day snapshot to get started.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Snapshot history with edit */}
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
                    {snapshots.map((snap) => {
                      const isEditing = editingId === snap.id;
                      return (
                        <div
                          key={snap.id}
                          className="rounded-lg border border-border bg-muted/20 p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              Snapshot #{snap.id} — {snap.time_of_day}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {snap.store_name ?? "default"} · {new Date(snap.timestamp).toLocaleString()}
                              </span>
                              {!isEditing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEdit(snap)}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              {editError && (
                                <p className="text-xs text-destructive">{editError}</p>
                              )}
                              <div className="space-y-1">
                                {editRows.map((row, i) => (
                                  <div key={row.product_type} className="flex items-center gap-2">
                                    <span className="text-xs flex-1 truncate">
                                      {row.product_type.replace(/_/g, " ")}
                                    </span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={row.count}
                                      onChange={(e) =>
                                        updateEditRow(i, parseInt(e.target.value) || 0)
                                      }
                                      className="w-20 h-7 text-xs tabular-nums"
                                    />
                                    {row.isNew && (
                                      <button
                                        onClick={() => removeEditRow(i)}
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Add new product row */}
                              <div className="flex items-center gap-2">
                                <Input
                                  value={newProductName}
                                  onChange={(e) => setNewProductName(e.target.value)}
                                  placeholder="New product name..."
                                  className="h-7 text-xs flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addEditRow();
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={addEditRow}
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={saveEdit}
                                  disabled={editSaving}
                                >
                                  {editSaving ? (
                                    <Loader2 className="size-3 animate-spin mr-1" />
                                  ) : (
                                    <Check className="size-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={cancelEdit}
                                  disabled={editSaving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      );
                    })}
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
