# Avyona Project

This repository is arranged as a multi-app project:

- `backend/`: Node + Express API
- `frontend/`: customer website built with React + Vite
- `dashboard/`: admin panel built with React + Vite
- `shared/`: shared constants and utilities used across apps

Current status:

- the apps are separated structurally
- frontend, dashboard, and backend wiring is intentionally deferred
- shared data and constants remain preserved for later integration

Suggested run commands:

- `cd frontend && npm install && npm run dev`
- `cd dashboard && npm install && npm run dev`
- `cd backend && npm install && npm run dev`
