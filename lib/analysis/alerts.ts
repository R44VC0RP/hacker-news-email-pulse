import { db } from '@/lib/db';
import { alerts, posts, snapshots } from '@/lib/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { getAgeBucket, calculatePostVelocity, getRecentSnapshots } from './velocity';
import { getGrowthBenchmarks, calculatePercentile, type BenchmarkMap } from './benchmarks';

export type AlertType = 'score_velocity' | 'comment_velocity' | 'breakthrough';

export interface AlertCandidate {
  postId: number;
  alertType: AlertType;
  percentile: number;
  growthRate: number;
  score: number;
  comments: number;
  postAgeMinutes: number;
}

/**
 * Get threshold for generating alerts (from env or default to 95)
 */
function getAlertThreshold(): number {
  const threshold = parseInt(process.env.ALERT_PERCENTILE_THRESHOLD || '95', 10);
  return Math.min(100, Math.max(0, threshold));
}

/**
 * Get active posts (created within last 48 hours)
 */
export async function getActivePosts(): Promise<typeof posts.$inferSelect[]> {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const activePosts = await db
    .select()
    .from(posts)
    .where(
      and(
        gte(posts.firstSeenAt, fortyEightHoursAgo),
        eq(posts.isDead, false),
        eq(posts.isDeleted, false)
      )
    )
    .orderBy(desc(posts.firstSeenAt));

  return activePosts;
}

/**
 * Create an alert in the database (with deduplication)
 */
export async function createAlert(candidate: AlertCandidate): Promise<boolean> {
  try {
    await db
      .insert(alerts)
      .values({
        postId: candidate.postId,
        alertType: candidate.alertType,
        percentile: candidate.percentile.toFixed(2),
        scoreAtAlert: candidate.score,
        commentsAtAlert: candidate.comments,
        growthRate: candidate.growthRate.toFixed(2),
        detectedAt: new Date(),
        postAgeMinutes: candidate.postAgeMinutes,
        isSent: false,
      })
      .onConflictDoNothing(); // Ignore if alert already exists for this post/type

    return true;
  } catch (error) {
    console.error(`Failed to create alert for post ${candidate.postId}:`, error);
    return false;
  }
}

/**
 * Main detection algorithm: analyze active posts and generate alerts
 */
export async function detectBreakoutPosts(): Promise<AlertCandidate[]> {
  const alertCandidates: AlertCandidate[] = [];

  // Get cached benchmarks
  const benchmarks = await getGrowthBenchmarks();

  if (!benchmarks) {
    console.warn('No benchmarks available - skipping detection');
    return [];
  }

  // Get all active posts
  const activePosts = await getActivePosts();

  if (activePosts.length === 0) {
    return [];
  }

  console.log(`Analyzing ${activePosts.length} active posts for breakout growth...`);

  const threshold = getAlertThreshold();

  // Process each post
  for (const post of activePosts) {
    try {
      // Get recent snapshots
      const recentSnapshots = await getRecentSnapshots(post.id, 2);

      if (recentSnapshots.length < 2) {
        continue; // Need at least 2 snapshots to calculate velocity
      }

      const [current, previous] = recentSnapshots;

      // Calculate velocity
      const velocity = calculatePostVelocity(recentSnapshots);

      if (!velocity) {
        continue;
      }

      // Determine age bucket
      const postAge = current.minutesSinceCreation;
      const ageBucket = getAgeBucket(postAge);

      // Get relevant benchmarks
      const scoreBenchmark = benchmarks[ageBucket].score_velocity;
      const commentBenchmark = benchmarks[ageBucket].comment_velocity;

      // Calculate percentile rankings
      const scorePercentile = calculatePercentile(velocity.scoreVelocity, scoreBenchmark);
      const commentPercentile = calculatePercentile(velocity.commentVelocity, commentBenchmark);

      // Check for score velocity alert
      if (scorePercentile >= threshold && current.score >= 10) {
        // Minimum absolute threshold
        alertCandidates.push({
          postId: post.id,
          alertType: 'score_velocity',
          percentile: scorePercentile,
          growthRate: velocity.scoreVelocity,
          score: current.score,
          comments: current.descendants || 0,
          postAgeMinutes: postAge,
        });
      }

      // Check for comment velocity alert
      if (commentPercentile >= threshold && (current.descendants || 0) >= 5) {
        // Minimum absolute threshold
        alertCandidates.push({
          postId: post.id,
          alertType: 'comment_velocity',
          percentile: commentPercentile,
          growthRate: velocity.commentVelocity,
          score: current.score,
          comments: current.descendants || 0,
          postAgeMinutes: postAge,
        });
      }

      // Breakthrough detection: very young post with exceptional growth
      if (postAge < 30 && scorePercentile >= 90 && current.score >= 20) {
        alertCandidates.push({
          postId: post.id,
          alertType: 'breakthrough',
          percentile: scorePercentile,
          growthRate: velocity.scoreVelocity,
          score: current.score,
          comments: current.descendants || 0,
          postAgeMinutes: postAge,
        });
      }
    } catch (error) {
      console.error(`Error analyzing post ${post.id}:`, error);
      continue;
    }
  }

  // Create alerts in database
  let alertsCreated = 0;
  for (const candidate of alertCandidates) {
    const created = await createAlert(candidate);
    if (created) alertsCreated++;
  }

  console.log(`Generated ${alertsCreated} alerts from ${alertCandidates.length} candidates`);

  return alertCandidates;
}

/**
 * Get recent unsent alerts, excluding posts that have already been sent in a previous digest
 */
export async function getUnsentAlerts(limit = 20): Promise<Array<typeof alerts.$inferSelect & { post: typeof posts.$inferSelect }>> {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const unsentAlerts = await db
    .select({
      alert: alerts,
      post: posts,
    })
    .from(alerts)
    .innerJoin(posts, eq(alerts.postId, posts.id))
    .where(
      and(
        eq(alerts.isSent, false),
        gte(alerts.detectedAt, fourHoursAgo),
        // Exclude posts that have already had any alert sent (prevents duplicate posts in digests)
        sql`${alerts.postId} NOT IN (SELECT post_id FROM alerts WHERE is_sent = true)`
      )
    )
    .orderBy(desc(alerts.percentile), desc(alerts.detectedAt))
    .limit(limit);

  return unsentAlerts.map(row => ({
    ...row.alert,
    post: row.post,
  }));
}

/**
 * Mark alerts as sent - marks ALL alerts for the posts that were included in the digest
 * This ensures a post won't appear in future digests even if it had multiple alert types
 */
export async function markAlertsAsSent(alertIds: number[]): Promise<void> {
  if (alertIds.length === 0) return;

  // First, get the post IDs for all the alerts being sent
  const alertsToMark = await db
    .select({ postId: alerts.postId })
    .from(alerts)
    .where(sql`${alerts.id} IN (${sql.join(alertIds.map(id => sql`${id}`), sql`, `)})`);

  const postIds = [...new Set(alertsToMark.map(a => a.postId))];

  if (postIds.length === 0) return;

  // Mark ALL alerts for these posts as sent (not just the specific alert IDs)
  await db
    .update(alerts)
    .set({ isSent: true })
    .where(sql`${alerts.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`);
}
