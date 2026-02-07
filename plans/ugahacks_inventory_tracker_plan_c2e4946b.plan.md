---
name: UGAHacks Inventory Tracker Plan
overview: "A plan for your UGAHacks 11 retail inventory tracker: recommended tech stack, 36-hour timeline, and an honest critical ranking of the idea against the NCR Voyix and First Time Hacker tracks."
todos: []
isProject: false
---

# UGAHacks 11: Retail Inventory Tracker — Tech Stack, Timeline & Critical Ranking

## Hackathon constraints (from [Devpost](https://ugahacks-11.devpost.com/))

- **Hacking window:** 8PM Feb 6 → 8AM Feb 8 EST (**~36 hours**)
- **NCR Voyix track:** "Create a simple dashboard predicting stockouts and suggesting reorder timing addressing inefficient inventory management."
- **First Time Hacker track:** Beginner-friendly; judges see your project 2–4 minutes at expo.
- **Rules:** No pre-written code; README with tools, problems overcome, team names, and credit for APIs/frameworks.

### Product end-goal (your context)

A business takes **one photo in the morning and one at end-of-day (EOD)** daily. The model forecasts based on:

- **Change in inventory** — delta between AM and EOD counts (daily drawdown / usage).
- **Local trends** — e.g. day-of-week, seasonality, or regional data if you add it later.
- **Business-specific inputs** — store type, product mix, reorder thresholds, or other settings the business configures.

For the hackathon, implement the AM + EOD cadence and store each snapshot with a "time of day" (AM vs EOD) so your forecast can use daily deltas; local trends and business specifics can be simple (e.g. manual settings or synthetic) for the demo.

---

## 1. Recommended tech stack

### Core principle: **Ship a working demo in 36 hours**

Prioritize one clear flow (photo → count → dashboard → forecast) over perfect CV or advanced ML.


| Layer               | Recommendation                                                   | Why                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | **Next.js**                                                      | You prefer it; great for dashboard, file upload, and calling your FastAPI backend. Deploy on Vercel.                                                                                          |
| **Backend**         | **FastAPI (Python)**                                             | You prefer it; ideal for wrapping Gemini, forecasting (statsmodels/Darts), and DB access. Deploy on Railway or Render.                                                                        |
| **Computer vision** | **Google Gemini API (Vision)** — see Gemini vs Rekognition below | Sponsor prize, no training, prompt-based inventory extraction. **Recommendation: Gemini over Rekognition** for this project.                                                                  |
| **Database**        | **SQLite for first-timers** — see Database section below         | Easiest for 36h: no signup, one file. Supabase is a good next step if you add auth or multi-tenant later.                                                                                     |
| **Forecasting**     | **Simple time series in Python (FastAPI)**                       | **statsmodels** or **Darts**. Use **daily delta** (EOD − AM) as usage/demand signal. Optionally use business settings (e.g. reorder point) as inputs. Synthetic history is fine for the demo. |
| **Hosting / demo**  | **Vercel (Next.js) + Railway or Render (FastAPI)**               | Free tiers; Next.js talks to FastAPI via env var (e.g. `NEXT_PUBLIC_API_URL`).                                                                                                                |


### Stack summary (your stack)

- **Next.js** (frontend) → **FastAPI** (Gemini + forecasting + SQLite) → deploy Next.js on Vercel, FastAPI on Railway or Render.

### Gemini vs Amazon Rekognition

**Recommendation: use Google Gemini API (Vision), not Rekognition.**

- **Gemini:** One API key; send image + prompt (e.g. "List and count each product type on this shelf. Return JSON."). No training. You can include business context in the prompt and get structured JSON (product name, count). Adapts to different stores/products without retraining. **MLH "Best Use of Gemini API" prize** at UGAHacks.
- **Rekognition:** Best for generic object/label detection. To get "product A: 12, product B: 5" you’d need Custom Labels (training with your own images) or extra logic to group/count labels. More setup, no sponsor track at this hackathon.

Use **Gemini** for this project; use Rekognition only if you later need production-scale, low-latency object detection on AWS.

### Database for first-timers: SQLite vs Supabase

**Recommendation: start with SQLite.**

- **SQLite:** Easiest for a 36h hack. No account, no server, no connection string. Create `inventory.db`, use Python `sqlite3` or SQLAlchemy in FastAPI. Works offline; one file for dev and demo. Best for first-timers to get something working fast.
- **Supabase:** Sign up → create project → connection string. Adds auth, real-time, dashboard. Good if you want multi-store or login in the demo; adds ~1–2 hours setup and env vars. Use as an upgrade path if you have time.

For first-time hackers: **SQLite** first; consider **Supabase** only if you need auth or multi-tenant and have time.

**NCR Voyix angle:** If NCR provides APIs (e.g. [Retail APIs](https://developer.ncr.com/portals/dev-portal/api-explorer/retail)), plan 2–4 hours to plug in **catalog or store context** (e.g. product names, store ID) so the dashboard "predicts stockouts and suggests reorder timing" in a way that looks integrated with retail systems, even if the core logic is your own.

---

## 2. Timeline (36 hours)

Rough split for a team of 4. Parallelize by role (frontend, backend/CV, data/forecasting, integration/docs).


| Phase                  | Time  | Goals                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fri 8PM – midnight** | ~4 h  | **Setup + CV pipeline:** Repo, env, DB schema. One endpoint: upload image + **AM or EOD** flag → call Gemini → return list/count of items. Store results (`timestamp`, `time_of_day` AM/EOD, `product_type`, `count`) in DB. Frontend: upload page (choose AM or EOD) + display last count.                                                                                                                              |
| **Sat 12AM – 8AM**     | ~8 h  | **Dashboard + synthetic history:** Dashboard showing "current inventory" from latest photo and a simple table/history of counts. **Add synthetic time-series** (e.g. 2–4 weeks of daily AM/EOD counts per product) so you can compute **daily delta** (EOD − AM) and forecast. Implement one simple forecast (e.g. exponential smoothing on daily usage) and show "predicted demand" or "reorder date" on the dashboard. |
| **Sat 8AM – 6PM**      | ~10 h | **NCR + polish:** If NCR has a usable API, integrate it (e.g. product catalog or store). Refine prompts so Gemini output maps to "products" you can display. Reorder logic: e.g. "reorder when predicted stock &lt; threshold" or "reorder in X days." Improve UI (charts, clear copy for "stockout risk" and "suggested reorder").                                                                                      |
| **Sat 6PM – Sun 2AM**  | ~8 h  | **Demo + README:** Record a 1–2 min demo video. README: purpose, tech stack, how to run, problems faced, team names, API credits (Gemini, NCR, etc.). Test on a fresh clone.                                                                                                                                                                                                                                             |
| **Sun 2AM – 8AM**      | ~6 h  | **Buffer + submission:** Fix last-minute bugs, rehearse expo pitch, submit before 8AM.                                                                                                                                                                                                                                                                                                                                   |


**Critical scope cuts if behind:**

- Drop real CV training; use **only Gemini (or one Roboflow model)** for counts.
- Use **synthetic data only** for forecasting and reorder suggestions so the dashboard always shows something plausible.
- Single product category (e.g. "shelf with cans") to simplify prompts and UI.

---

## 3. Critical ranking of the idea

### Strengths

- **Strong fit for NCR Voyix:** The track asks for a "simple dashboard predicting stockouts and suggesting reorder timing." Your concept (photo → inventory → forecast → reorder suggestion) matches that directly. If you frame the demo as "inventory health monitor with visual input," it’s easy for NCR judges to see the value.
- **Differentiation:** Photo-driven inventory is more memorable than a spreadsheet-only tool and shows ambition (CV + forecasting).
- **First Time Hacker friendly:** You can keep the scope small (one type of shelf, synthetic data, one forecast model) and still tell a clear story: "We take a picture, the AI counts items, and we predict when to reorder."
- **Sponsor overlap:** Using **Gemini** for vision gives you a shot at the MLH Gemini prize without changing the idea.

### Weaknesses and risks

- **"Enough data" in 36 hours:** Real forecasting needs history. You won’t have many real photos in one weekend. **Mitigation:** Pre-generate or hand-create 2–4 weeks of per-product counts; treat the app as "designed to learn from photos over time" but demo forecasting on that synthetic history. Be transparent in the README.
- **CV reliability:** Generic vision APIs may misidentify or miscount products on cluttered shelves. **Mitigation:** Constrain the demo (e.g. one shelf, one product type, good lighting) and show confidence or "last updated from photo" so judges don’t assume it’s production-ready.
- **Scope creep:** Photo capture + CV + DB + dashboard + forecasting + NCR is a lot. **Mitigation:** Cut to the minimum: one upload flow, one count result, one forecast view, one reorder suggestion. Fancy features only if time allows.

### Honest grade and summary


| Criteria                    | Rating     | Note                                                                         |
| --------------------------- | ---------- | ---------------------------------------------------------------------------- |
| **Fit (NCR Voyix)**         | **A**      | Directly addresses "dashboard + stockout prediction + reorder timing."       |
| **Fit (First Time Hacker)** | **B+**     | Achievable if you use APIs (Gemini) and synthetic data; scope is manageable. |
| **Feasibility in 36h**      | **B**      | Achievable with strict scope and synthetic data; tight if you over-build.    |
| **Differentiation**         | **A-**     | Photo-based input stands out; CV + forecasting is a good story.              |
| **Technical risk**          | **Medium** | Mostly from trying to do too much or relying on real-data forecasting.       |


**Overall:** The idea is **strong and worth building**. To maximize your chances: (1) use **Gemini for vision** and **synthetic data for forecasting**, (2) keep the **dashboard and reorder logic** simple and visible, and (3) **explicitly tie the demo to NCR’s prompt** (stockouts + reorder timing) in your pitch and README.

---

## 4. Next steps (after you leave plan mode)

1. **Lock stack:** Choose Option A (separate Python API) or Option B (Next.js monolith) and create repo + env (Gemini API key, NCR if needed).
2. **Define "product" for demo:** e.g. "canned goods on one shelf" so Gemini prompts stay consistent.
3. **Build the pipeline in order:** image upload → Gemini → save counts → dashboard → add synthetic series → forecast → reorder suggestion.
4. **Reserve time for README and video** so submission and expo pitch are clear and complete.

Good luck at UGAHacks 11.