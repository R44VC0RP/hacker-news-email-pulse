# Hacker News Pulse

A real-time monitoring system that detects breakout stories on Hacker News using percentile-based velocity analysis.

## Features

- **5-Minute Polling**: Fetches all new HN posts and creates snapshots every 5 minutes
- **Smart Detection**: Uses percentile-based velocity analysis to detect posts growing faster than historical baselines
- **Automatic Alerts**: Generates alerts when posts exceed the 95th percentile for their age group
- **Daily Digests**: Batches alerts into email digests (max 5 per day)
- **Simple Dashboard**: Real-time UI showing alerts, tracked posts, and system stats

## Quick Start

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Run database migrations**
   ```bash
   bun run db:migrate
   ```

3. **Seed initial benchmarks** (one-time setup)
   ```bash
   bun run cron init
   ```

4. **Start development server**
   ```bash
   bun dev
   ```

5. **Test the cron jobs** (in another terminal)
   ```bash
   # Run all cron jobs
   bun run cron

   # Or run specific jobs
   bun run cron fetch        # Fetch posts & detect alerts
   bun run cron benchmarks   # Recalculate percentiles
   bun run cron digests      # Send email digests
   ```

6. **Visit the dashboard**
   - Landing: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard

## Available Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun run cron` - Run all cron jobs locally
- `bun run cron [job]` - Run specific cron job (fetch, benchmarks, digests, init)
- `bun run db:generate` - Generate new migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio (database GUI)

## How It Works

The system tracks ALL new Hacker News posts and compares their growth velocity against historical benchmarks:

1. Every 5 minutes, fetches new posts from HN API
2. Creates "snapshots" tracking score and comments over time
3. Calculates velocity (points/min, comments/min)
4. Compares against cached percentile thresholds by age bucket
5. Generates alerts for posts in top 5% (95th percentile)

## Deployment

Deploy to Vercel for automatic cron job execution:

```bash
vercel deploy
```

Set these environment variables in Vercel:
- `DATABASE_URL` (your Neon PostgreSQL URL)
- `CRON_SECRET` (generate a secure random string)

Vercel will automatically set up the 3 cron jobs from vercel.json.

## Project Structure

```
app/
├── api/cron/               # Cron job endpoints
└── dashboard/              # Dashboard UI

lib/
├── db/                     # Database (Drizzle ORM)
├── hn/                     # Hacker News API client
├── analysis/               # Growth detection logic
└── email/                  # Email templates (React Email)
```

## License

MIT
