import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, snapshots } from '@/lib/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/posts
 * Fetch top growing posts (last 24 hours)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get recent posts
    const recentPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          gte(posts.firstSeenAt, timeThreshold),
          eq(posts.isDead, false),
          eq(posts.isDeleted, false)
        )
      )
      .orderBy(desc(posts.firstSeenAt))
      .limit(Math.min(limit, 100));

    // Get latest snapshots for these posts
    const postsWithSnapshots = await Promise.all(
      recentPosts.map(async post => {
        const latestSnapshot = await db
          .select()
          .from(snapshots)
          .where(eq(snapshots.postId, post.id))
          .orderBy(desc(snapshots.capturedAt))
          .limit(1);

        return {
          ...post,
          latestSnapshot: latestSnapshot[0] || null,
        };
      })
    );

    // Filter out posts without snapshots and format
    const formattedPosts = postsWithSnapshots
      .filter(p => p.latestSnapshot)
      .map(p => ({
        id: p.id,
        title: p.title,
        url: p.url,
        author: p.author,
        postType: p.postType,
        firstSeenAt: p.firstSeenAt,
        currentScore: p.latestSnapshot!.score,
        currentComments: p.latestSnapshot!.descendants,
        ageMinutes: p.latestSnapshot!.minutesSinceCreation,
        lastUpdated: p.latestSnapshot!.capturedAt,
      }))
      .sort((a, b) => b.currentScore - a.currentScore); // Sort by score

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      count: formattedPosts.length,
    });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
