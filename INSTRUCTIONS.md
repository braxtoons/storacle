# Storacle Backend

FastAPI service for inventory snapshots, Gemini vision, and forecasting.

## Setup (first time)

**WSL / Linux:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**macOS:** Same as above (use `source venv/bin/activate`).

**Or use the setup script:**

```bash
cd backend
chmod +x setup.sh
./setup.sh
source venv/bin/activate
```

## Environment

Create a `.env` file in `backend/` with:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

## Run the server

From the repo root:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Or in one line from the repo root:

```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
```

Leave the terminal open. The API will be at **http://localhost:8000**.

## Test the backend

**Health check (browser or curl):**

- Open: http://localhost:8000/health  
- Or run: `curl http://localhost:8000/health`  
- Expected: `{"status":"ok"}`

**List snapshots (confirms DB + CORS):**

- Open: http://localhost:8000/snapshots  
- Or run: `curl http://localhost:8000/snapshots`  
- Expected: `[]` (empty list) or a list of snapshot objects

**Interactive API docs:**

- Swagger UI: http://localhost:8000/docs  
- ReDoc: http://localhost:8000/redoc  

## Stop the server

In the terminal where uvicorn is running, press **Ctrl+C**.
