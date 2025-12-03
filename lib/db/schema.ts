import { pgTable, serial, integer, text, timestamp, boolean, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Master table for all tracked HN posts
export const posts = pgTable('posts', {
  id: integer('id').primaryKey(), // HN post ID
  title: text('title').notNull(),
  url: text('url'),
  author: text('author').notNull(),
  postType: text('post_type').notNull(), // 'story', 'job', 'poll', 'ask', 'show'
  firstSeenAt: timestamp('first_seen_at').notNull(),
  lastUpdatedAt: timestamp('last_updated_at').notNull(),
  isDead: boolean('is_dead').default(false),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  firstSeenAtIdx: index('idx_posts_first_seen').on(table.firstSeenAt),
  postTypeIdx: index('idx_posts_type').on(table.postType),
  authorIdx: index('idx_posts_author').on(table.author),
}));

// Time-series data for tracking post metrics over time
export const snapshots = pgTable('snapshots', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  score: integer('score').notNull(),
  descendants: integer('descendants').default(0), // Comment count
  capturedAt: timestamp('captured_at').notNull(),
  minutesSinceCreation: integer('minutes_since_creation').notNull(), // Pre-calculated for performance
}, (table) => ({
  postIdIdx: index('idx_snapshots_post').on(table.postId, table.capturedAt),
  capturedAtIdx: index('idx_snapshots_captured').on(table.capturedAt),
  ageIdx: index('idx_snapshots_age').on(table.minutesSinceCreation),
  uniquePostCapture: uniqueIndex('unique_post_capture').on(table.postId, table.capturedAt),
}));

// Generated alerts for high-growth posts
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  alertType: text('alert_type').notNull(), // 'score_velocity', 'comment_velocity', 'breakthrough'
  percentile: decimal('percentile', { precision: 5, scale: 2 }).notNull(),
  scoreAtAlert: integer('score_at_alert').notNull(),
  commentsAtAlert: integer('comments_at_alert').notNull(),
  growthRate: decimal('growth_rate', { precision: 10, scale: 2 }).notNull(), // Points/minute or comments/minute
  detectedAt: timestamp('detected_at').notNull(),
  postAgeMinutes: integer('post_age_minutes').notNull(),
  isSent: boolean('is_sent').default(false),
}, (table) => ({
  detectedAtIdx: index('idx_alerts_detected').on(table.detectedAt),
  sentIdx: index('idx_alerts_sent').on(table.isSent, table.detectedAt),
  postIdIdx: index('idx_alerts_post').on(table.postId),
  uniquePostAlert: uniqueIndex('unique_post_alert').on(table.postId, table.alertType),
}));

// Track digest emails sent
export const emailDigests = pgTable('email_digests', {
  id: serial('id').primaryKey(),
  sentAt: timestamp('sent_at').notNull(),
  alertIds: integer('alert_ids').array().notNull(), // Array of alert IDs included
  alertCount: integer('alert_count').notNull(),
  digestType: text('digest_type').notNull(), // 'hourly', 'urgent', 'daily_summary'
  status: text('status').default('pending'), // 'pending', 'sent', 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sentAtIdx: index('idx_digests_sent').on(table.sentAt),
  statusIdx: index('idx_digests_status').on(table.status),
}));

// Cached percentile thresholds for performance
export const growthBenchmarks = pgTable('growth_benchmarks', {
  id: serial('id').primaryKey(),
  ageBucket: text('age_bucket').notNull(), // 'new' (0-30min), 'young' (30-120min), 'mature' (120+)
  metricType: text('metric_type').notNull(), // 'score_velocity', 'comment_velocity'
  p50: decimal('p50', { precision: 10, scale: 2 }),
  p75: decimal('p75', { precision: 10, scale: 2 }),
  p90: decimal('p90', { precision: 10, scale: 2 }),
  p95: decimal('p95', { precision: 10, scale: 2 }),
  p99: decimal('p99', { precision: 10, scale: 2 }),
  sampleSize: integer('sample_size').notNull(),
  calculatedAt: timestamp('calculated_at').notNull(),
}, (table) => ({
  calculatedAtIdx: index('idx_benchmarks_calculated').on(table.calculatedAt),
  uniqueBenchmark: uniqueIndex('unique_benchmark').on(table.ageBucket, table.metricType),
}));
