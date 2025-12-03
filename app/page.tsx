import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="space-y-12">
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold tracking-tight text-foreground">
              Hacker News Pulse
            </h1>
            <p className="text-xl text-muted-foreground">
              Real-time breakout story detection for Hacker News
            </p>
          </div>

          <div className="space-y-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              HN Pulse monitors all new posts on Hacker News and uses percentile-based
              velocity analysis to detect stories that are growing exceptionally fast.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-foreground font-medium">
                  Every 5 Minutes
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fetches new posts and creates snapshots to track growth over time
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-foreground font-medium">
                  Smart Detection
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Compares each post's velocity against historical percentiles
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-foreground font-medium">
                  Daily Digests
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Batches alerts into digestible emails (max 5/day)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-background bg-foreground hover:opacity-90 transition-opacity"
            >
              View Dashboard
            </Link>
            <a
              href="https://news.ycombinator.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-foreground border border-border hover:bg-muted transition-colors"
            >
              Visit Hacker News
            </a>
          </div>

          <div className="pt-8 text-sm text-muted-foreground">
            <p>
              Built with Next.js, Drizzle ORM, Neon PostgreSQL, and Vercel Cron
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
