# Personal Finance Management System

Full-stack personal finance app: ASP.NET Core Web API backend, React (Vite) frontend, local SQLite database.

## Prerequisites
- .NET SDK 8.0 or newer (tested with 10.0.x; target framework net8.0)
- Node.js 20+ with npm/corepack/pnpm
- Windows (OS reminder toasts supported; other OS runs backend/frontend without toasts)

## Project structure
- `FinanceApi/` - ASP.NET Core backend
- `finance-ui/` - React + Vite frontend
- Database file: `FinanceApi/finance.db` (created on first run)

## Backend setup and run
```powershell
cd FinanceApi
dotnet restore
dotnet build
dotnet run --urls http://localhost:5139
```
On first run, EF Core migrations are applied automatically and default categories are seeded.  
Swagger UI: http://localhost:5139/swagger  
API base: http://localhost:5139

## Frontend setup and run
```powershell
cd finance-ui
pnpm install
pnpm dev
```
If `pnpm` is unavailable, use `npm install` and `npm run dev`.  
Frontend: http://localhost:5173  
Configure API URL in `finance-ui/.env` (`VITE_API_URL`).

## Database migrations (manual)
```powershell
cd FinanceApi
dotnet tool install --global dotnet-ef --version 8.0.11
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Features
- Dashboard with totals, charts, recent transactions, upcoming reminders
- Expense and income CRUD, search, filtering, pagination, sorting
- Custom expense categories with rename/deactivate and duplicate prevention
- Reminders (once, daily, monthly, yearly, every N days/months) with snooze/complete
- Windows toast notifications via backend hosted scheduler (works with browser closed while backend runs)
- Browser notifications while app is open
- Reports: summary, categories, monthly comparison, trend, income vs expense
- CSV export and printable reports (browser print)

## Reminder limitations
Browser notifications require the frontend tab and permission. OS toasts require the backend process running; to keep it always on, configure Windows Task Scheduler to start `dotnet run` (or a published executable) at login.

## Backup / restore
Stop the app, copy `FinanceApi/finance.db` (and `-wal/-shm` if present) to a safe location. Restore by replacing the file while the app is stopped.

## Progressive Web App (PWA)
- The frontend includes a manifest and service worker; browsers can install it as a standalone app.
- 1-minute on-screen alarms appear automatically when reminders are due and remain visible with a countdown. Users can dismiss or snooze for 10 minutes.
- OS toasts still require the backend process.

## Quick run (Windows)
- Install frontend deps: double-click `install-frontend.cmd`
- Run backend: double-click `run-backend.cmd`
- Run frontend: double-click `finance-ui/run-frontend.cmd`

## Run with Docker
From the repository root, build and start the frontend and API:
```powershell
docker compose up --build
```
Open the frontend at http://localhost:5173 and Swagger at http://localhost:5139/swagger. SQLite data is stored in the `finance-data` Docker volume and survives container recreation.

To stop the services, press Ctrl+C and run `docker compose down`. The database volume is retained. To remove the database too, run `docker compose down --volumes`.

If the default ports are already in use, set `FRONTEND_PORT` and/or `API_PORT` before starting Compose. For example, in PowerShell:
```powershell
$env:FRONTEND_PORT = "5175"
docker compose up --build
```
The frontend API URL is baked in at build time and defaults to `http://localhost:$API_PORT`. Set `VITE_API_URL` to a browser-accessible API URL when deploying somewhere other than the local machine, then rebuild the frontend image.

## Solution
- Open `PersonalFinance.sln` in Visual Studio (classic format). It contains:
  - `FinanceApi` (.NET backend)
  - `FinanceUi.Build` (.NET wrapper whose Build target runs the React frontend build)
- Build the solution from Visual Studio or `dotnet build PersonalFinance.sln`.
- To run backend and frontend, use `run-backend.cmd` and `finance-ui/run-frontend.cmd` (or `run-all.ps1`).
- Running the frontend Visual Studio project itself only builds it; use the run script/cmd to start the Vite dev server.

## Troubleshooting
- Port in use: change `--urls` and `VITE_API_URL`.
- CORS errors: add origin to `appsettings.json` Cors:AllowedOrigins.
- Reset database: stop app, delete `finance.db`, restart (recreates and reseeds).
