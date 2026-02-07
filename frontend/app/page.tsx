import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Storacle</h1>
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Snapshot
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Inventory Dashboard
          </h2>
          <p className="text-gray-600">
            Track your inventory snapshots and view demand forecasts
          </p>
        </div>

        {/* Placeholder for snapshot list */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Snapshots
          </h3>
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No snapshots yet</p>
            <Link
              href="/upload"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Upload your first snapshot
            </Link>
          </div>
        </div>

        {/* Placeholder for forecast section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Demand Forecast
          </h3>
          <div className="text-center py-12 text-gray-500">
            <p>Forecast data will appear here once you have snapshot history</p>
          </div>
        </div>
      </main>
    </div>
  );
}
