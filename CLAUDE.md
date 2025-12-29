# Nanobanana - Development Guide

## Tech Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 4 (Slate palette, light/dark mode)
- SQLite (better-sqlite3)
- Gemini API (@google/genai)

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest

npm run db:backup        # Backup DB + JSON export
npm run db:restore       # Restore from backup

npm run batches:list     # List Gemini batch jobs
npm run batches:download # Download batch results
```

**Note:** CLI scripts need env vars loaded first:
```bash
set -a && source .env.local && set +a && node scripts/list-batches.js
```

## Environment

```
GEMINI_API_KEY=your-key-here
```

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components
- `src/lib/` - Database and Gemini client utilities
- `scripts/` - CLI utilities for batch management
- `data/` - SQLite database, uploads, results, backups (gitignored except .gitkeep)

## Key Files

- `src/lib/db.ts` - SQLite schema and queries
- `src/lib/gemini.ts` - Gemini batch API integration
- `src/app/api/jobs/route.ts` - Job creation and listing
- `src/app/page.tsx` - Main UI with T2I/I2I forms

## Architecture

### Batch API Flow
1. User submits prompt(s) → creates job in SQLite with status `pending`
2. Job items created, images uploaded to Gemini Files API
3. Batch request submitted → status becomes `processing`
4. UI polls `/api/jobs/[id]` every 2 seconds for updates
5. When Gemini batch completes, results downloaded and saved to `data/results/`
6. Job status becomes `completed` or `failed`

**Batch jobs take 10-30+ minutes** - they're async and queued by Gemini.

### Database Schema
- `jobs` - parent record with prompt, settings, status, counts
- `job_items` - individual images (1 per prompt for T2I, 1 per uploaded image for I2I)

### State Management
- React state for jobs/items (polled from API)
- localStorage for UI preferences (active tab via `nanobanana-mode`)

## Code Patterns

### Adding new output settings
1. Add type to `src/app/page.tsx` (e.g., `type NewSetting = ...`)
2. Update form component props and state
3. Pass through to `/api/jobs` POST handler
4. Store in database, pass to Gemini API in `src/lib/gemini.ts`

### Component conventions
- Forms use `onSubmit` callback with typed data object
- Job cards show different states: pending (spinner), processing (shimmer), completed (thumbnails), failed (error)
- All API calls use fetch with proper error handling

## Gemini API Notes

- Model: `gemini-2.0-flash-exp` for batch image generation
- Batch API gives 50% cost reduction vs real-time
- Images uploaded via Files API before batch submission
- Output sizes: 1K (~$0.02), 2K (~$0.07), 4K (~$0.12) per image
