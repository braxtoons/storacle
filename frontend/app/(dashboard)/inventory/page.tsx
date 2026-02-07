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
import { Package } from "lucide-react";

// Placeholder data for layout only
const placeholderProducts = [
  { product_type: "Canned tomatoes", count: 42, status: "ok" as const },
  { product_type: "Canned beans", count: 8, status: "low" as const },
  { product_type: "Soup (assorted)", count: 24, status: "ok" as const },
  { product_type: "Green beans", count: 15, status: "ok" as const },
];

function StatusBadge({ status }: { status: "ok" | "low" | "out" }) {
  if (status === "ok")
    return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-foreground border-emerald-500/30">OK</Badge>;
  if (status === "low")
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-foreground border-amber-500/30">Low</Badge>;
  return <Badge variant="destructive">Out</Badge>;
}

export default function InventoryPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Latest counts from snapshots
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Current inventory
            </CardTitle>
            <CardDescription>
              Product types and counts from the most recent snapshot. Use Upload
              to add AM or EOD photos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholderProducts.map((row) => (
                  <TableRow key={row.product_type}>
                    <TableCell className="font-medium">
                      {row.product_type}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Snapshot history</CardTitle>
            <CardDescription>
              AM and EOD snapshots by date (placeholder). Data will come from the
              API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              Snapshot list will appear here when connected to the backend.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
