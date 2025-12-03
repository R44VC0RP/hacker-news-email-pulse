import type { HNItem, HNStory } from './types';
import { isValidStory } from './types';

const HN_API_BASE = process.env.HN_API_BASE_URL || 'https://hacker-news.firebaseio.com/v0';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with exponential backoff retry
async function fetchWithRetry<T>(url: string, retries = MAX_RETRIES): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 0 }, // Don't cache - we want fresh data
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Item doesn't exist or was deleted
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error(`Failed to fetch ${url} after ${retries + 1} attempts:`, error);
        return null;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffDelay = RETRY_DELAY * Math.pow(2, attempt);
      console.warn(`Fetch failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${backoffDelay}ms...`);
      await delay(backoffDelay);
    }
  }

  return null;
}

/**
 * Fetch list of new story IDs from HN
 * Returns up to 500 newest story IDs
 */
export async function fetchNewStories(): Promise<number[]> {
  const url = `${HN_API_BASE}/newstories.json`;
  const storyIds = await fetchWithRetry<number[]>(url);
  return storyIds || [];
}

/**
 * Fetch details for a single post by ID
 */
export async function fetchPostDetails(id: number): Promise<HNStory | null> {
  const url = `${HN_API_BASE}/item/${id}.json`;
  const item = await fetchWithRetry<HNItem>(url);

  if (!item || !isValidStory(item)) {
    return null;
  }

  return {
    id: item.id,
    title: item.title!,
    url: item.url,
    by: item.by,
    time: item.time,
    score: item.score || 0,
    descendants: item.descendants || 0,
    type: item.type,
    deleted: item.deleted,
    dead: item.dead,
  };
}

/**
 * Fetch details for multiple posts in batches with concurrency control
 * @param ids - Array of post IDs to fetch
 * @param concurrency - Maximum number of concurrent requests (default: 50)
 */
export async function fetchPostDetailsBatch(
  ids: number[],
  concurrency = 50
): Promise<HNStory[]> {
  const results: HNStory[] = [];

  // Process in batches
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(id => fetchPostDetails(id))
    );

    // Filter out nulls (deleted/invalid posts)
    const validPosts = batchResults.filter((post): post is HNStory => post !== null);
    results.push(...validPosts);

    // Small delay between batches to be courteous
    if (i + concurrency < ids.length) {
      await delay(100);
    }
  }

  return results;
}

/**
 * Fetch top stories (front page)
 * Returns up to 500 top story IDs
 */
export async function fetchTopStories(): Promise<number[]> {
  const url = `${HN_API_BASE}/topstories.json`;
  const storyIds = await fetchWithRetry<number[]>(url);
  return storyIds || [];
}

/**
 * Fetch best stories (highest voted recent stories)
 */
export async function fetchBestStories(): Promise<number[]> {
  const url = `${HN_API_BASE}/beststories.json`;
  const storyIds = await fetchWithRetry<number[]>(url);
  return storyIds || [];
}
