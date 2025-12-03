import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Hacker News Pulse
            </h1>
            <p className="text-2xl text-muted-foreground">
              Real-time breakout story detection for Hacker News
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6 text-lg">
            <p className="text-muted-foreground">
              HN Pulse monitors all new posts on Hacker News and uses percentile-based
              velocity analysis to detect stories that are growing exceptionally fast.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-6 border rounded-lg">
                <div className="text-orange-600 font-semibold mb-2">
                  Every 5 Minutes
                </div>
                <p className="text-sm text-muted-foreground">
                  Fetches new posts and creates snapshots to track growth over time
                </p>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-orange-600 font-semibold mb-2">
                  Smart Detection
                </div>
                <p className="text-sm text-muted-foreground">
                  Compares each post's velocity against historical percentiles
                </p>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-orange-600 font-semibold mb-2">
                  Daily Digests
                </div>
                <p className="text-sm text-muted-foreground">
                  Batches alerts into digestible emails (max 5/day)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-orange-600 px-8 py-3 text-lg font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              View Dashboard
            </Link>
            <a
              href="https://news.ycombinator.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-orange-600 px-8 py-3 text-lg font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
            >
              Visit Hacker News
            </a>
          </div>

          <div className="pt-12 text-sm text-muted-foreground">
            <p>
              Built with Next.js, Drizzle ORM, Neon PostgreSQL, and Vercel Cron
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
