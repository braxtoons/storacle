# UGAHacks 11: Storacle 
### Braxton Scarborough, Noah Piontek, Zachary Locker, Tyler Price

## Project Purpose: 

A business takes **one photo in the morning and one at end-of-day (EOD)** daily. The model forecasts based on:

- **Change in inventory** — delta between AM and EOD counts (daily drawdown / usage).
- **Local trends** — e.g. day-of-week, seasonality, or regional data if you add it later.
- **Business-specific inputs** — store type, product mix, reorder thresholds, or other settings the business configures.

For the hackathon, implement the AM + EOD cadence and store each snapshot with a "time of day" (AM vs EOD) so your forecast can use daily deltas; local trends and business specifics can be simple (e.g. manual settings or synthetic) for the demo.

---

## Technologies: 

- **FastAPI** - (Frontend) 
- **Next.js** - (Backend) 
- **SQLite** - (Database) 
- **VITE** - (Hosting) 
- **Kaggle** - (Dataset) 
- **Gemini Image Recognition** - (Computer Vision) 
- **shadcn/ui** - (UI) 

## Challenges:

## Credits: 
             
