# ReliefLink React frontend — connected to the real backend

The original frontend was a mock-only demo; it now sends real requests via `src/api.js` and receives live updates via `src/socket.js` (SSE). The archived mock file is retained only for historical reference and is **not imported or used**.

The recommended Windows approach is to run `RUN_WINDOWS.bat` from the project root (one window, port 5173). For development, run `npm run dev:backend` with `PORT=5000` and `npm run dev:frontend` in separate terminals. The frontend dev server is port 5173 and proxies `/api` to port 5000.

The root `SETUP_WINDOWS_CLICK_BY_CLICK.md` contains all required steps.
