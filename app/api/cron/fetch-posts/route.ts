import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, snapshots } from '@/lib/db/schema';
import { fetchNewStories, fetchPostDetailsBatch } from '@/lib/hn/api';
import { getPostType } from '@/lib/hn/types';
import { detectBreakoutPosts, getActivePosts } from '@/lib/analysis/alerts';
import { seedInitialBenchmarks } from '@/lib/analysis/benchmarks';
import { eq } from 'drizzle-orm';

export const maxDuration = 60; // Maximum execution time (Vercel limit)
export const dynamic = 'force-dynamic';

/**
 * Main cron job: Fetch HN posts, create snapshots, detect alerts
 * Runs every 5 minutes via Vercel cron
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check authorization
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== Fetch Posts Cron Job Started ===');

    // Step 1: Fetch new story IDs from HN
    console.log('Fetching new story IDs from Hacker News...');
    const storyIds = await fetchNewStories();

    if (storyIds.length === 0) {
      console.warn('No stories fetched from HN API');
      return NextResponse.json({
        success: true,
        message: 'No stories available',
        execution_time_ms: Date.now() - startTime,
      });
    }

    console.log(`Fetched ${storyIds.length} story IDs`);

    // Step 2: Fetch post details in batches (limit to top 200 to stay within time limit)
    const idsToFetch = storyIds.slice(0, 200);
    console.log(`Fetching details for ${idsToFetch.length} posts...`);

    const postDetails = await fetchPostDetailsBatch(idsToFetch, 50);
    console.log(`Successfully fetched ${postDetails.length} post details`);

    // Step 3: Upsert posts into database
    let postsUpserted = 0;

    for (const post of postDetails) {
      try {
        const postType = getPostType(post);
        const postTime = new Date(post.time * 1000);

        await db
          .insert(posts)
          .values({
            id: post.id,
            title: post.title,
            url: post.url || null,
            author: post.by,
            postType,
            firstSeenAt: postTime,
            lastUpdatedAt: new Date(),
            isDead: post.dead || false,
            isDeleted: post.deleted || false,
          })
          .onConflictDoUpdate({
            target: posts.id,
            set: {
              title: post.title,
              url: post.url || null,
              lastUpdatedAt: new Date(),
              isDead: post.dead || false,
              isDeleted: post.deleted || false,
            },
          });

        postsUpserted++;
      } catch (error) {
        console.error(`Failed to upsert post ${post.id}:`, error);
      }
    }

    console.log(`Upserted ${postsUpserted} posts to database`);

    // Step 4: Create snapshots for active posts (last 48 hours)
    console.log('Creating snapshots for active posts...');
    const activePosts = await getActivePosts();

    let snapshotsCreated = 0;

    for (const post of activePosts) {
      try {
        // Find the post in fetched details to get current score
        const currentPost = postDetails.find(p => p.id === post.id);

        if (!currentPost) {
          continue; // Post not in current fetch
        }

        const minutesSinceCreation = Math.floor(
          (Date.now() - post.firstSeenAt.getTime()) / (1000 * 60)
        );

        await db.insert(snapshots).values({
          postId: post.id,
          score: currentPost.score,
          descendants: currentPost.descendants,
          capturedAt: new Date(),
          minutesSinceCreation,
        });

        snapshotsCreated++;
      } catch (error) {
        // Ignore duplicate snapshot errors (unique constraint)
        if (!(error instanceof Error && error.message.includes('unique'))) {
          console.error(`Failed to create snapshot for post ${post.id}:`, error);
        }
      }
    }

    console.log(`Created ${snapshotsCreated} snapshots`);

    // Step 5: Detect breakout posts
    console.log('Running breakout detection...');
    let alertsGenerated = 0;

    try {
      const alertCandidates = await detectBreakoutPosts();
      alertsGenerated = alertCandidates.length;
      console.log(`Generated ${alertsGenerated} alerts`);
    } catch (error) {
      console.error('Breakout detection failed:', error);
      // Continue execution - don't fail the whole job
    }

    // Execution summary
    const executionTime = Date.now() - startTime;
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      stats: {
        story_ids_fetched: storyIds.length,
        posts_processed: postDetails.length,
        posts_upserted: postsUpserted,
        active_posts: activePosts.length,
        snapshots_created: snapshotsCreated,
        alerts_generated: alertsGenerated,
      },
    };

    console.log('=== Cron Job Completed ===');
    console.log(JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('=== Cron Job Failed ===');
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 } // Return 200 to prevent Vercel retries
    );
  }
}

/**
 * Initialization endpoint (one-time setup)
 * Call this manually to seed initial benchmarks
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Seeding initial benchmarks...');
    await seedInitialBenchmarks();

    return NextResponse.json({
      success: true,
      message: 'Initial benchmarks seeded successfully',
    });
  } catch (error) {
    console.error('Failed to seed benchmarks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
