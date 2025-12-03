import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, snapshots, alerts, emailDigests } from '@/lib/db/schema';
import { gte, eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 * Fetch system statistics
 */
export async function GET() {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const today = new Date(now.setHours(0, 0, 0, 0));

    // Total posts tracked
    const totalPostsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts);
    const totalPosts = Number(totalPostsResult[0]?.count || 0);

    // Active posts (last 48 hours)
    const activePostsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          gte(posts.firstSeenAt, fortyEightHoursAgo),
          eq(posts.isDead, false),
          eq(posts.isDeleted, false)
        )
      );
    const activePosts = Number(activePostsResult[0]?.count || 0);

    // Total snapshots
    const totalSnapshotsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snapshots);
    const totalSnapshots = Number(totalSnapshotsResult[0]?.count || 0);

    // Snapshots created today
    const snapshotsTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snapshots)
      .where(gte(snapshots.capturedAt, today));
    const snapshotsToday = Number(snapshotsTodayResult[0]?.count || 0);

    // Alerts generated (last 24 hours)
    const alertsLast24hResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(gte(alerts.detectedAt, twentyFourHoursAgo));
    const alertsLast24h = Number(alertsLast24hResult[0]?.count || 0);

    // Total alerts
    const totalAlertsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts);
    const totalAlerts = Number(totalAlertsResult[0]?.count || 0);

    // Unsent alerts
    const unsentAlertsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.isSent, false));
    const unsentAlerts = Number(unsentAlertsResult[0]?.count || 0);

    // Digests sent today
    const digestsTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailDigests)
      .where(gte(emailDigests.sentAt, today));
    const digestsToday = Number(digestsTodayResult[0]?.count || 0);

    const maxDigestsPerDay = parseInt(process.env.MAX_DIGESTS_PER_DAY || '5', 10);

    // Latest cron execution (most recent snapshot)
    const latestSnapshotResult = await db
      .select()
      .from(snapshots)
      .orderBy(sql`${snapshots.capturedAt} DESC`)
      .limit(1);

    const lastCronRun = latestSnapshotResult[0]?.capturedAt || null;

    return NextResponse.json({
      success: true,
      stats: {
        posts: {
          total: totalPosts,
          active: activePosts,
        },
        snapshots: {
          total: totalSnapshots,
          today: snapshotsToday,
        },
        alerts: {
          total: totalAlerts,
          last24h: alertsLast24h,
          unsent: unsentAlerts,
        },
        digests: {
          today: digestsToday,
          max: maxDigestsPerDay,
          remaining: Math.max(0, maxDigestsPerDay - digestsToday),
        },
        system: {
          lastCronRun,
          status: lastCronRun && (Date.now() - lastCronRun.getTime()) < 10 * 60 * 1000 ? 'healthy' : 'warning',
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
