# ReliefLink REST API reference

Default single-process base URL: `http://localhost:5173/api`.
Development base URL (separate backend): `http://localhost:5000/api`.
JSON input and response. For protected endpoints, pass `Authorization: Bearer <token>` using the `token` returned by `/auth/login` or `/auth/register`. The frontend automatically handles it.

### Health

`GET /api/health` → `{ "status":"ok", "service":"ReliefLink", "database":"sqlite", "realtime":"sse" }`.

### Auth

`POST /api/auth/login` with `{ "email":"admin@demo.lk", "password":"ReliefDemo#2026!" }` → `{token,user}`.
`POST /api/auth/register` with `{ "name":"Sample", "email":"example@example.com", "password":"Example123", "role":"volunteer", "phone":"", "skills":"first aid" }` → `{token,user}`. Admin self-registration not allowed.
`GET /api/auth/me` → `{user}` (protected).
`PATCH /api/auth/me` with `{name,phone,skills,availability}` → `{user}` (protected; role change not accepted).
`POST /api/auth/logout` → `{ok:true}` (protected, revokes session token).

### Stats (public)

`GET /api/stats` → `{ incidents:{active,critical,total}, shelters:{sheltered,capacity}, volunteers:{total,available}, tasks:{open,completed} }`.

### Incidents

`GET /api/incidents` → `{incidents:[...]}`. Optional query filters `status`, `type`, and `severity`.
`POST /api/incidents` → `{incident}`, requires login. Body: `{title,type,severity,description,address,lat,lng}`.
`PATCH /api/incidents/:id/status` → `{incident}`, admin only, body `{status}`. Allowed: `reported`, `verified`, `in_progress`, `resolved`.
`DELETE /api/incidents/:id` → `{ok:true}`, admin only; deletes linked tasks via SQLite foreign-key cascade.

Incident types: `flood`, `landslide`, `cyclone`, `earthquake`, `fire`, `drought`, `medical`, `other`.
Severities: `low`, `medium`, `high`, `critical`.
Location coordinates: latitude -90..90, longitude -180..180. Reports require a location.

### Shelters

`GET /api/shelters` → `{shelters:[...]}` (public).
`POST /api/shelters` with `{name,address,lat,lng,capacity,occupancy,contact,supplies}` → `{shelter}` (admin).
`PATCH /api/shelters/:id` with `{occupancy}` or `{status:"open"|"closed"}` → `{shelter}` (admin). Automatic `full` status when occupancy equals capacity; never over capacity.
`DELETE /api/shelters/:id` → `{ok:true}` (admin).

### Alerts

`GET /api/alerts` → `{alerts:[...]}` (public).
`POST /api/alerts` with `{message,level}` → `{alert}` (admin). Level: `info`, `warning`, `danger`.
`DELETE /api/alerts/:id` → `{ok:true}` (admin).

### Volunteer tasks

`GET /api/tasks` → `{tasks:[...]}`, admin/volunteer. Optional `?mine=1`, `?status=open` etc.
`POST /api/tasks` with `{incident_id,title,description,required_skill}` → `{task}` (admin).
`POST /api/tasks/:id/accept` → `{task}` (available volunteer, open tasks only).
`POST /api/tasks/:id/release` → `{task}` (assigned volunteer or admin, only active tasks).
`POST /api/tasks/:id/assign` with `{volunteer_id}` → `{task}` (admin, available volunteers only).
`PATCH /api/tasks/:id/status` with `{status:"in_progress"|"completed"}` → `{task}` (assignee or admin; valid transitions only).
`DELETE /api/tasks/:id` → `{ok:true}` (admin).
`GET /api/users/volunteers` → `{volunteers:[...{active_tasks,completed_tasks}]}` (admin).

### Live updates (SSE, no Socket.IO dependency)

`GET /api/events` uses `text/event-stream`, no authentication for public event feed. Each message has a JSON shape:

`data: {"event":"incident:new","payload":{...}}`

Event names: `incident:new`, `incident:update`, `incident:delete`, `shelter:update`, `alert:new`, `alert:removed`, and `task:changed`. Browser `src/socket.js` is a compatibility emitter backed by native `EventSource`. Only public data is broadcast; this demo must not be used for sensitive real-world incidents.

### Errors

`{ "error":"Human readable message" }` with HTTP 400 (invalid data), 401 (not logged in), 403 (no permission), 404 (missing resource), 409 (conflict), 413 (body too large), 429 (login temporarily throttled), or 500 (unexpected server fault).
