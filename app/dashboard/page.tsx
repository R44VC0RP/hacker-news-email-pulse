import { StatsCards } from '@/components/dashboard/StatsCards';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { PostsTable } from '@/components/dashboard/PostsTable';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Hacker News Pulse
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time monitoring system detecting breakout stories on Hacker News
          </p>
        </div>

        <div className="space-y-8">
          {/* Stats Overview */}
          <StatsCards />

          {/* Recent Alerts */}
          <AlertsList />

          {/* Active Posts Table */}
          <PostsTable />
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Data updates every minute • Cron runs every 5 minutes •{' '}
            <a
              href="https://news.ycombinator.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:underline"
            >
              Visit Hacker News
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
