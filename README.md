# Job Importer - Backend (Express + BullMQ + MongoDB)

## Overview
Simple backend for the Scalable Job Importer challenge. Features:
- Fetch RSS/XML feeds and convert to JSON
- Queue jobs using BullMQ (Redis)
- Worker processes that insert/update jobs into MongoDB
- Import run logs stored into `import_logs` collection
- HTTP API endpoints to get import logs and trigger import manually

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` or `npm start`

## Notes
This is a simplified, self-contained example. For production:
- Add auth, validation, tests
- Use Docker and proper process managers
- Add retry/backoff, metrics and monitoring
