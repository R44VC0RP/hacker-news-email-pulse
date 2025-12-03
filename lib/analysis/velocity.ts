import { db } from '@/lib/db';
import { snapshots } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export type AgeBucket = 'new' | 'young' | 'mature';

export interface Velocity {
  scoreVelocity: number; // Points per minute
  commentVelocity: number; // Comments per minute
  timeElapsed: number; // Minutes between snapshots
}

export interface SnapshotPair {
  current: typeof snapshots.$inferSelect;
  previous: typeof snapshots.$inferSelect;
}

/**
 * Determine age bucket based on minutes since post creation
 */
export function getAgeBucket(minutesSinceCreation: number): AgeBucket {
  if (minutesSinceCreation <= 30) return 'new';
  if (minutesSinceCreation <= 120) return 'young';
  return 'mature';
}

/**
 * Get age bucket range (for benchmark queries)
 */
export function getAgeBucketRange(bucket: AgeBucket): { min: number; max: number } {
  switch (bucket) {
    case 'new':
      return { min: 0, max: 30 };
    case 'young':
      return { min: 31, max: 120 };
    case 'mature':
      return { min: 121, max: 999999 };
  }
}

/**
 * Fetch the two most recent snapshots for a post
 * Used to calculate current velocity
 */
export async function getRecentSnapshots(postId: number, limit = 2): Promise<typeof snapshots.$inferSelect[]> {
  const recentSnapshots = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.postId, postId))
    .orderBy(desc(snapshots.capturedAt))
    .limit(limit);

  return recentSnapshots;
}

/**
 * Fetch recent snapshots for multiple posts
 * Returns a map of postId -> snapshots array
 */
export async function getRecentSnapshotsBatch(
  postIds: number[]
): Promise<Map<number, typeof snapshots.$inferSelect[]>> {
  if (postIds.length === 0) return new Map();

  // Fetch all snapshots for these posts
  const allSnapshots = await db
    .select()
    .from(snapshots)
    .where(
      and(
        // @ts-expect-error - inArray typing issue with drizzle
        eq(snapshots.postId, postIds),
        // Only get snapshots from last hour (2 snapshots per post max)
        gte(snapshots.capturedAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    )
    .orderBy(desc(snapshots.capturedAt));

  // Group by post ID
  const snapshotsByPost = new Map<number, typeof snapshots.$inferSelect[]>();

  for (const snapshot of allSnapshots) {
    const existing = snapshotsByPost.get(snapshot.postId) || [];
    if (existing.length < 2) {
      // Only keep the 2 most recent
      existing.push(snapshot);
      snapshotsByPost.set(snapshot.postId, existing);
    }
  }

  return snapshotsByPost;
}

/**
 * Calculate velocity between two snapshots
 */
export function calculateVelocity(
  current: typeof snapshots.$inferSelect,
  previous: typeof snapshots.$inferSelect
): Velocity | null {
  // Ensure current is actually newer than previous
  if (current.capturedAt <= previous.capturedAt) {
    return null;
  }

  const timeElapsed = (current.capturedAt.getTime() - previous.capturedAt.getTime()) / (1000 * 60); // minutes

  // Avoid division by zero
  if (timeElapsed === 0) {
    return null;
  }

  const scoreDiff = current.score - previous.score;
  const commentDiff = (current.descendants || 0) - (previous.descendants || 0);

  // Ignore negative velocity (score/comment decreases)
  const scoreVelocity = Math.max(0, scoreDiff / timeElapsed);
  const commentVelocity = Math.max(0, commentDiff / timeElapsed);

  return {
    scoreVelocity,
    commentVelocity,
    timeElapsed,
  };
}

/**
 * Calculate velocity for a post given its recent snapshots
 */
export function calculatePostVelocity(
  recentSnapshots: typeof snapshots.$inferSelect[]
): Velocity | null {
  if (recentSnapshots.length < 2) {
    return null;
  }

  const [current, previous] = recentSnapshots;
  return calculateVelocity(current, previous);
}
