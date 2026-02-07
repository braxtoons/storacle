"use client";

import { useState } from "react";
import { Camera, Sun, Moon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<"AM" | "EOD">("AM");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus({ type: "error", message: "Please select an image file" });
      return;
    }
    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setUploadStatus({
        type: "success",
        message: `Snapshot uploaded successfully! (${timeOfDay})`,
      });
      setSelectedFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setUploadStatus({
        type: "error",
        message:
          error instanceof Error
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
        <div className="max-w-2xl mx-auto space-y-6">
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
      </div>
    </>
  );
}
