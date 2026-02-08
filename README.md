# Storacle

**Retail inventory tracker with AI-powered vision and demand forecasting**

Built for UGAHacks 11 | NCR Voyix Track (Stockout Prediction + Reorder Timing) | General AI | First Timer | .tech Domain Name 

## Team

Braxton Scarborough, Noah Piontek, Zachary Locker, Tyler Price

## Project Purpose 

Storacle helps retail businesses track inventory with just two photos per day (morning and end-of-day). Using Google Gemini Vision API, it automatically counts products and forecasts stockouts to suggest optimal reorder timing.

**Core Features:**
- Image-based inventory counting via Gemini Vision
- Time-series demand forecasting
- Stockout prediction and reorder suggestions
- Visual dashboard for inventory trends

### Development Workflow

1. **Take Photos:** Capture inventory images (AM and EOD)
2. **Upload:** POST to `/snapshots/upload` with image and time
3. **Process:** Gemini Vision counts products automatically
4. **Analyze:** View trends and forecasts on dashboard
5. **Reorder:** Get stockout alerts and reorder timing suggestions

## Challenges 

The main issues we ran into were developing a solid plan to handle image uploading and data display for the user. We discussed countless ways that images could be uploaded and how that could data be displayed. We drafted some mock-ups of the site design, went through many iterations, and ultimately chose the design and layout we thought would best suit the user.    

## Tech Stack

- **Frontend:** Next.js (TypeScript, Tailwind CSS)
- **Backend:** FastAPI (Python)
- **Computer Vision:** Google Gemini API
- **Database:** SQLite (SQLAlchemy ORM)
- **Forecasting:** Darts, scikit-learn
- **Deployment:** Vercel (frontend), Railway/Render (backend)

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```

5. Run the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

   The default configuration should work for local development:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Database Pipeline

All inventory data flows into a single SQLite database (`inventory.db`) through three paths:

```
Photo upload ──→ Gemini Vision ──→ JSON ──→ DB
Manual entry ────────────────────────────→ DB
Manual edit  ────────────────────────────→ DB
```

### Schema

**`snapshots`** — One row per inventory check (AM opening or EOD closing).

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-incremented ID |
| `timestamp` | DateTime | When the snapshot was taken |
| `time_of_day` | String | `"AM"` or `"EOD"` |
| `store_name` | String | Store identifier (e.g. `"downtown_grocery"`) |

**`inventory_counts`** — One row per product type per snapshot.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-incremented ID |
| `snapshot_id` | Integer (FK) | References `snapshots.id` |
| `product_type` | String | e.g. `"canned_beans"`, `"pasta"` |
| `count` | Integer | Number of items counted |

### Multi-Store Support

All stores share one database, filtered by `store_name`. Pass `?store_name=my_store` on GET requests or include `store_name` in POST/form data.

### Gemini Vision Integration

When a photo is uploaded, Gemini Vision analyzes the shelf image and returns a JSON array of product counts:

```json
[{"product_type": "canned_beans", "count": 12}, {"product_type": "pasta", "count": 8}]
```

Each item becomes an `InventoryCount` row linked to the snapshot.

## API Documentation

Once the backend is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/snapshots?store_name=X` | List recent snapshots (optionally filter by store) |
| `POST` | `/snapshots/upload` | Upload shelf photo → Gemini counts → DB (form: `file`, `time_of_day`, `store_name`) |
| `POST` | `/snapshots/manual` | Manually create a snapshot with counts (JSON body) |
| `PUT` | `/snapshots/{id}/counts` | Edit counts on an existing snapshot (JSON body) |
| `GET` | `/forecast` | Demand forecast and reorder suggestions |

### Example: Manual Entry

```bash
curl -X POST http://localhost:8000/snapshots/manual \
  -H "Content-Type: application/json" \
  -d '{
    "time_of_day": "AM",
    "store_name": "downtown_grocery",
    "counts": [
      {"product_type": "canned_beans", "count": 45},
      {"product_type": "pasta", "count": 30}
    ]
  }'
```

### Example: Edit Counts

```bash
curl -X PUT http://localhost:8000/snapshots/1/counts \
  -H "Content-Type: application/json" \
  -d '[{"product_type": "canned_beans", "count": 50}]'
```

## Project Structure

```
storacle/
├── backend/              # FastAPI service
│   ├── main.py          # API routes, Gemini integration
│   ├── models.py        # SQLAlchemy ORM models (Snapshot, InventoryCount)
│   ├── database.py      # Database configuration
│   ├── requirements.txt # Python dependencies
│   ├── .env.example     # Environment template
│   └── setup.sh         # Automated setup script
├── frontend/            # Next.js application
│   ├── app/            # Next.js App Router pages
│   ├── lib/            # Utilities and API client
│   └── .env.local.example
├── CLAUDE.md           # Project guidelines for AI assistance
└── INSTRUCTIONS.md     # Detailed setup instructions
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for vision processing | Yes |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

## License

MIT License - Built for UGAHacks 11

## Acknowledgments

- Google Gemini API for vision capabilities
- UGAHacks organizing team
