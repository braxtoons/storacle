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

TO-DO 

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

## API Documentation

Once the backend is running: 
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

- `GET /health` - Health check
- `GET /snapshots` - List recent inventory snapshots
- `POST /snapshots/upload` - Upload inventory image (accepts `file` and `time_of_day`)
- `GET /forecast` *(planned)* - Get demand forecast and reorder suggestions

## Project Structure

```
storacle/
├── backend/              # FastAPI service
│   ├── main.py          # API routes and endpoints
│   ├── models.py        # SQLAlchemy ORM models
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

- NCR Voyix for the challenge track
- Google Gemini API for vision capabilities
- UGAHacks organizing team
