"use client";

import { useState, useEffect } from "react";
import { Camera, Sun, Moon, ImageIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { uploadSnapshot, ApiError, type InventoryCount } from "@/lib/api";
import { useStoreName } from "@/lib/use-store";
import Link from "next/link";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UploadPage() {
  const storeName = useStoreName();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<"AM" | "EOD">("AM");
  const [snapshotDate, setSnapshotDate] = useState(todayISO());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [resultCounts, setResultCounts] = useState<InventoryCount[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke old object URLs on cleanup
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadStatus({ type: null, message: "" });
      setResultCounts([]);
      // Show preview of selected file before upload
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus({ type: "error", message: "Please select an image file" });
      return;
    }

    // Create preview URL before upload (file ref is still valid)
    const blobUrl = URL.createObjectURL(selectedFile);

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });
    setResultCounts([]);
    try {
      const response = await uploadSnapshot(selectedFile, timeOfDay, storeName, snapshotDate);
      setResultCounts(response.counts);
      setUploadStatus({
        type: "success",
        message: `Snapshot #${response.snapshot_id} uploaded successfully! (${timeOfDay}, ${snapshotDate}) — ${response.counts.length} product type(s) detected.`,
      });
      // Show preview of the uploaded image
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(blobUrl);
      setSelectedFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
      setUploadStatus({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Failed to upload snapshot. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="text-lg font-semibold">Upload snapshot</h2>
        <p className="text-sm text-muted-foreground">
          AM or EOD photo per day
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Left column: form + detected products */}
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="size-5" />
                  Daily inventory photo
                </CardTitle>
                <CardDescription>
                  Take one photo in the morning (AM) and one at end-of-day (EOD).
                  Clear, well-lit images improve count accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label>Time of day</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="timeOfDay"
                          value="AM"
                          checked={timeOfDay === "AM"}
                          onChange={() => setTimeOfDay("AM")}
                          className="sr-only peer"
                        />
                        <span
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                            timeOfDay === "AM"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <Sun className="size-4" />
                          Morning (AM)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="timeOfDay"
                          value="EOD"
                          checked={timeOfDay === "EOD"}
                          onChange={() => setTimeOfDay("EOD")}
                          className="sr-only peer"
                        />
                        <span
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                            timeOfDay === "EOD"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <Moon className="size-4" />
                          End of day (EOD)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="snapshot-date" className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      Snapshot date
                    </Label>
                    <input
                      id="snapshot-date"
                      type="date"
                      value={snapshotDate}
                      onChange={(e) => setSnapshotDate(e.target.value)}
                      max={todayISO()}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Date the photo was taken. Defaults to today.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="file-input">Inventory image</Label>
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 transition-colors hover:bg-muted/30">
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      {selectedFile ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                          <ImageIcon className="size-4" />
                          {selectedFile.name}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          PNG, JPG or WEBP. One photo per snapshot.
                        </p>
                      )}
                    </div>
                  </div>

                  {uploadStatus.type && (
                    <div
                      className={cn(
                        "rounded-lg border p-4 text-sm",
                        uploadStatus.type === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-foreground"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {uploadStatus.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                  >
                    {isUploading ? "Uploading…" : "Upload snapshot"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {resultCounts.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Detected products</CardTitle>
                  <CardDescription>
                    Gemini Vision identified {resultCounts.length} product type(s).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultCounts.map((item, i) => (
                        <TableRow key={`${item.product_type}-${i}`}>
                          <TableCell className="font-medium">{item.product_type.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Link
                    href="/inventory"
                    className="inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    View in Inventory &rarr;
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Use consistent lighting and angle each day</li>
                  <li>Keep products visible and not obscured</li>
                  <li>Upload AM at open, EOD at closing for accurate daily delta</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right column: image preview */}
          <div className="space-y-6">
            {previewUrl && (
              <Card className="border-border bg-card">
<CardHeader>
                <CardTitle className="text-base">
                  {resultCounts.length > 0 ? "Uploaded image" : "Preview"}
                </CardTitle>
                <CardDescription>
                  {resultCounts.length > 0
                    ? "Snapshot photo that was uploaded."
                    : "Select an image to see a preview before uploading."}
                </CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Uploaded snapshot"
                      className="w-full h-auto object-contain max-h-[600px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
