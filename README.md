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

## Ecommerce analytics architecture

Current phase uses MySQL plus scheduled aggregation:

- Frontend sends non-blocking events to the backend analytics API.
- Backend validates, sanitizes, rate-limits, deduplicates by client event id, and stores raw events.
- Cron runs `cd backend && npm run analytics:aggregate` every 5 minutes or hourly.
- Aggregation updates `daily_product_metrics`, `daily_category_metrics`, `daily_search_metrics`, and `daily_funnel_metrics`.
- Dashboard reads only aggregated tables. It must not query `analytics_events`.

Scaling plan:

- Phase 1: raw events table, event API, basic storefront tracking.
- Phase 2: cron aggregation jobs and dashboard metrics.
- Phase 3: optional Kafka/queue, Redis cache, and search-engine integration. Kafka is not needed at the current stage.
