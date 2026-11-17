> **ARCHIVED FILE:** These are the original uploaded mock-mode instructions. They are NOT the current running instructions. Use the root SETUP_WINDOWS_CLICK_BY_CLICK.md instead.

# ReliefLink frontend (demo mode)

Runs with NO backend. All data is fake and lives in the browser (resets on refresh).

    npm install
    npm run dev        # open http://localhost:5173

Use the Admin / Volunteer / Citizen buttons on the Login page to preview each role.

## For the backend developer
- The full API contract (routes, request bodies, response shapes) is in `src/mock/mockServer.js`.
- Live events used by the UI (Socket.IO): alert:new, alert:removed, incident:new, incident:update,
  incident:delete, shelter:update, task:changed.
- To connect the real backend:
  1. In `src/api.js` it already supports it: run with `VITE_MOCK=false` (e.g. `VITE_MOCK=false npm run dev`).
  2. Replace `src/socket.js` with the original socket.io-client version:

         import { io } from 'socket.io-client';
         import { getToken } from './api.js';
         export const socket = io(import.meta.env.VITE_API_URL || undefined, { auth: (cb) => cb({ token: getToken() }) });
         export function reconnectSocket() { socket.disconnect(); socket.connect(); }

  3. Backend runs on http://localhost:5000 (Vite proxies /api and /socket.io there).
