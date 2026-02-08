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
  store_name?: string;
  counts?: InventoryCount[];
}

export interface SnapshotUploadResponse {
  snapshot_id: number;
  timestamp: string;
  time_of_day: string;
  counts: InventoryCount[];
}

/** Forecast result from GET /forecast */
export interface ForecastResult {
  product_type: string;
  store_name: string | null;
  current_inventory: number;
  horizon_days: number;
  predicted_demand_per_day: number[];
  predicted_stock_needed: number;
  demand_history_days: number;
  restock_date_median: string;
  restock_date_low?: string;
  restock_date_high?: string;
  restock_confidence_level: number | null;
  restock_day_median?: number;
  restock_day_low?: number;
  restock_day_high?: number;
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
  timeOfDay: "AM" | "EOD",
  storeName: string = "default"
): Promise<SnapshotUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("time_of_day", timeOfDay);
  formData.append("store_name", storeName);

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
 * List product types that have enough AM+EOD history to forecast
 */
export async function getForecastableProducts(
  storeName?: string
): Promise<{ product_types: string[] }> {
  const params = storeName ? `?store_name=${encodeURIComponent(storeName)}` : "";
  const response = await fetch(`${API_BASE_URL}/forecast/products${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || "Failed to fetch forecastable products",
      response.status,
      errorData
    );
  }
  return response.json();
}

/**
 * Get demand forecast and restock date for a product type
 */
export async function getForecast(
  productType: string,
  options?: { storeName?: string; horizon?: number; safetyStock?: number }
): Promise<ForecastResult> {
  const params = new URLSearchParams({ product_type: productType });
  if (options?.storeName) params.set("store_name", options.storeName);
  if (options?.horizon != null) params.set("horizon", String(options.horizon));
  if (options?.safetyStock != null)
    params.set("safety_stock", String(options.safetyStock));
  const response = await fetch(`${API_BASE_URL}/forecast?${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || "Failed to fetch forecast",
      response.status,
      errorData
    );
  }
  return response.json();
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
