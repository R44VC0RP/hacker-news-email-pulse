// Hacker News API Types
// Based on https://github.com/HackerNews/API

export type HNItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export interface HNItem {
  id: number;
  deleted?: boolean;
  type: HNItemType;
  by: string;         // Username of the item's author
  time: number;       // Unix timestamp
  text?: string;      // HTML content for comments/text posts
  dead?: boolean;
  parent?: number;    // Parent item ID for comments
  poll?: number;      // Poll ID for poll options
  kids?: number[];    // Child comment IDs
  url?: string;       // URL of the story
  score?: number;     // Story score (upvotes)
  title?: string;     // Story title
  parts?: number[];   // Poll option IDs for polls
  descendants?: number; // Total comment count
}

// Simplified type for stories we care about
export interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
  type: HNItemType;
  deleted?: boolean;
  dead?: boolean;
}

// Post type mapping for our database
export type PostType = 'story' | 'ask' | 'show' | 'job' | 'poll';

export function getPostType(item: HNItem): PostType {
  if (item.type === 'job') return 'job';
  if (item.type === 'poll') return 'poll';

  // Detect Ask HN and Show HN from title
  const title = item.title?.toLowerCase() || '';
  if (title.startsWith('ask hn:')) return 'ask';
  if (title.startsWith('show hn:')) return 'show';

  return 'story';
}

export function isValidStory(item: HNItem | null): item is HNStory {
  if (!item) return false;
  if (item.deleted || item.dead) return false;
  if (!item.by || !item.title) return false;
  if (item.type !== 'story' && item.type !== 'job' && item.type !== 'poll') return false;

  return true;
}
