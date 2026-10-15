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
- Web Push reminder notifications when the installed app is minimized or closed (requires server configuration and an active backend)
- On-screen alarm overlay while the app is open
- Reports: summary, categories, monthly comparison, trend, income vs expense
- CSV export and printable reports (browser print)

## Background reminder notifications
The finance records and full reminders remain in each device's browser storage. To deliver reminders while the app is closed, the API stores each device's Web Push subscription and the minimum schedule fields needed to send the alert (reminder name, due time, and recurrence). It does not store the reminder description. Each installed device has its own subscription and reminder schedule.

Generate one VAPID key pair and keep it stable. For example, run `npx web-push generate-vapid-keys` in a terminal. Set these environment variables on the API host (Render: API service > Environment):

```text
WebPush__PublicKey=<VAPID public key>
WebPush__PrivateKey=<VAPID private key>
WebPush__Subject=mailto:you@example.com
```

Set `VITE_API_URL` to the public API URL on the frontend build service, rebuild/redeploy the frontend, then open the installed app on each device and select **Settings > Enable background alerts**. Allow notifications when prompted. Keep the API service running so its scheduler can send reminders. Delivery also depends on internet connectivity, browser support, notification permission, and the device's power settings. A push notification can appear while the app is closed; tapping it opens the app. Browsers do not allow a website to force itself to the foreground over other apps.

On Render's Free web-service plan, an idle service spins down after 15 minutes without inbound traffic, so its in-process reminder scheduler cannot reliably send alerts while asleep. Use a plan/service that stays running for reliable background delivery.

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

## Device-local data
The frontend stores finance records in browser storage on the device and browser profile where the app is installed. It does not send those records to the API or sync them between a phone and laptop. Each device starts with its own empty data set and default categories. Use Settings to download a JSON backup before clearing browser data or uninstalling the app. For background push, the API receives reminder schedules and device subscription details only; it does not receive expense or income records.

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
