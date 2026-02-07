"use client";

import Link from "next/link";
import { useState } from "react";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<"AM" | "EOD">("AM");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "Please select an image file",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      // TODO: Uncomment when backend is ready
      // const result = await uploadSnapshot(selectedFile, timeOfDay);
      // console.log("Upload result:", result);

      // For now, simulating upload
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setUploadStatus({
        type: "success",
        message: `Snapshot uploaded successfully! (${timeOfDay})`,
      });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Storacle</h1>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Upload Inventory Snapshot
          </h2>
          <p className="text-gray-600">
            Take a photo of your inventory and upload it for analysis
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Time of Day Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time of Day
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeOfDay"
                    value="AM"
                    checked={timeOfDay === "AM"}
                    onChange={(e) => setTimeOfDay("AM")}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Morning (AM)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeOfDay"
                    value="EOD"
                    checked={timeOfDay === "EOD"}
                    onChange={(e) => setTimeOfDay("EOD")}
                    className="mr-2"
                  />
                  <span className="text-gray-700">End of Day (EOD)</span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label
                htmlFor="file-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Inventory Image
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {/* Status Messages */}
            {uploadStatus.type && (
              <div
                className={`p-4 rounded-md ${
                  uploadStatus.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {uploadStatus.message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload Snapshot"}
            </button>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Take clear, well-lit photos of your inventory</li>
            <li>Ensure products are visible and not obscured</li>
            <li>
              Upload AM snapshot at the start of the day, EOD at closing time
            </li>
            <li>Consistent photo angles help improve accuracy</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
