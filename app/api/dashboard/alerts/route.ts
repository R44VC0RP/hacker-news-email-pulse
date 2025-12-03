import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { alerts, posts } from '@/lib/db/schema';
import { eq, desc, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/alerts
 * Fetch recent alerts with post details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const recentAlerts = await db
      .select({
        alert: alerts,
        post: posts,
      })
      .from(alerts)
      .innerJoin(posts, eq(alerts.postId, posts.id))
      .where(gte(alerts.detectedAt, timeThreshold))
      .orderBy(desc(alerts.detectedAt))
      .limit(Math.min(limit, 100)); // Cap at 100

    const formattedAlerts = recentAlerts.map(row => ({
      id: row.alert.id,
      postId: row.alert.postId,
      alertType: row.alert.alertType,
      percentile: parseFloat(row.alert.percentile),
      growthRate: parseFloat(row.alert.growthRate),
      scoreAtAlert: row.alert.scoreAtAlert,
      commentsAtAlert: row.alert.commentsAtAlert,
      postAgeMinutes: row.alert.postAgeMinutes,
      detectedAt: row.alert.detectedAt,
      isSent: row.alert.isSent,
      post: {
        id: row.post.id,
        title: row.post.title,
        url: row.post.url,
        author: row.post.author,
        postType: row.post.postType,
        firstSeenAt: row.post.firstSeenAt,
      },
    }));

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      count: formattedAlerts.length,
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
