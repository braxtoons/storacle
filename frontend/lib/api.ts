/**
 * API client for Storacle backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Type definitions
export interface InventoryCount {
  product_type: string;
  count: number;
}

export interface Snapshot {
  id: number;
  timestamp: string;
  time_of_day: "AM" | "EOD";
}

export interface SnapshotUploadResponse {
  snapshot_id: number;
  timestamp: string;
  time_of_day: string;
  counts: InventoryCount[];
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Upload an inventory snapshot image
 *
 * @param file - Image file to upload
 * @param timeOfDay - Either "AM" or "EOD"
 * @returns Snapshot data with inventory counts
 */
export async function uploadSnapshot(
  file: File,
  timeOfDay: "AM" | "EOD"
): Promise<SnapshotUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("time_of_day", timeOfDay);

  try {
    const response = await fetch(`${API_BASE_URL}/snapshots/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || "Failed to upload snapshot",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error: Unable to reach the server", 0);
  }
}

/**
 * Fetch list of recent snapshots
 *
 * @returns Array of snapshot objects
 */
export async function getSnapshots(): Promise<Snapshot[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/snapshots`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || "Failed to fetch snapshots",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error: Unable to reach the server", 0);
  }
}

/**
 * Health check endpoint
 *
 * @returns Health status object
 */
export async function checkHealth(): Promise<{ status: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new ApiError("Health check failed", response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error: Unable to reach the server", 0);
  }
}
