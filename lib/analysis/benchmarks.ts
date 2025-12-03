import { db } from '@/lib/db';
import { growthBenchmarks, snapshots } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { AgeBucket } from './velocity';
import { getAgeBucketRange } from './velocity';

export type MetricType = 'score_velocity' | 'comment_velocity';

export interface Benchmark {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  sampleSize: number;
}

export interface BenchmarkMap {
  new: {
    score_velocity: Benchmark;
    comment_velocity: Benchmark;
  };
  young: {
    score_velocity: Benchmark;
    comment_velocity: Benchmark;
  };
  mature: {
    score_velocity: Benchmark;
    comment_velocity: Benchmark;
  };
}

/**
 * Get cached benchmarks from database
 */
export async function getGrowthBenchmarks(): Promise<BenchmarkMap | null> {
  const benchmarkRows = await db
    .select()
    .from(growthBenchmarks)
    .orderBy(growthBenchmarks.calculatedAt);

  if (benchmarkRows.length === 0) {
    return null;
  }

  // Build the benchmark map
  const result: Partial<BenchmarkMap> = {};

  for (const row of benchmarkRows) {
    const bucket = row.ageBucket as AgeBucket;
    const metric = row.metricType as MetricType;

    if (!result[bucket]) {
      result[bucket] = {} as any;
    }

    result[bucket]![metric] = {
      p50: parseFloat(row.p50 || '0'),
      p75: parseFloat(row.p75 || '0'),
      p90: parseFloat(row.p90 || '0'),
      p95: parseFloat(row.p95 || '0'),
      p99: parseFloat(row.p99 || '0'),
      sampleSize: row.sampleSize,
    };
  }

  // Check if we have all required benchmarks
  if (
    !result.new?.score_velocity ||
    !result.new?.comment_velocity ||
    !result.young?.score_velocity ||
    !result.young?.comment_velocity ||
    !result.mature?.score_velocity ||
    !result.mature?.comment_velocity
  ) {
    return null;
  }

  return result as BenchmarkMap;
}

/**
 * Calculate percentile ranking for a value given benchmarks
 * Uses linear interpolation between known percentiles
 */
export function calculatePercentile(value: number, benchmark: Benchmark): number {
  if (value <= benchmark.p50) {
    return Math.min(50, (value / benchmark.p50) * 50);
  }
  if (value <= benchmark.p75) {
    return 50 + ((value - benchmark.p50) / (benchmark.p75 - benchmark.p50)) * 25;
  }
  if (value <= benchmark.p90) {
    return 75 + ((value - benchmark.p75) / (benchmark.p90 - benchmark.p75)) * 15;
  }
  if (value <= benchmark.p95) {
    return 90 + ((value - benchmark.p90) / (benchmark.p95 - benchmark.p90)) * 5;
  }
  if (value <= benchmark.p99) {
    return 95 + ((value - benchmark.p95) / (benchmark.p99 - benchmark.p95)) * 4;
  }

  // Beyond 99th percentile
  return 99 + Math.min(1, (value - benchmark.p99) / benchmark.p99);
}

/**
 * Calculate percentiles from an array of numbers
 */
function calculatePercentiles(values: number[]): Omit<Benchmark, 'sampleSize'> {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);

  const getPercentile = (p: number): number => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  };

  return {
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

/**
 * Recalculate benchmarks from historical data
 * Analyzes the last 7 days of snapshot pairs
 */
export async function recalculateBenchmarks(): Promise<{
  benchmarksUpdated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let benchmarksUpdated = 0;

  const ageBuckets: AgeBucket[] = ['new', 'young', 'mature'];
  const metricTypes: MetricType[] = ['score_velocity', 'comment_velocity'];

  const lookbackDays = 7;
  const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  for (const bucket of ageBuckets) {
    const { min, max } = getAgeBucketRange(bucket);

    // Query to get velocity samples for this age bucket
    // This finds consecutive snapshot pairs and calculates velocities
    const velocityQuery = sql`
      WITH snapshot_pairs AS (
        SELECT
          s1.post_id,
          s1.score as score1,
          s2.score as score2,
          s1.descendants as comments1,
          s2.descendants as comments2,
          EXTRACT(EPOCH FROM (s2.captured_at - s1.captured_at)) / 60 as time_elapsed_minutes
        FROM ${snapshots} s1
        INNER JOIN ${snapshots} s2 ON s2.post_id = s1.post_id
        WHERE s2.captured_at = (
          SELECT MIN(captured_at)
          FROM ${snapshots}
          WHERE post_id = s1.post_id
            AND captured_at > s1.captured_at
            AND captured_at <= s1.captured_at + INTERVAL '10 minutes'
        )
        AND s1.captured_at >= ${lookbackDate}
        AND s1.minutes_since_creation >= ${min}
        AND s1.minutes_since_creation <= ${max}
      )
      SELECT
        (score2 - score1) / NULLIF(time_elapsed_minutes, 0) as score_velocity,
        (comments2 - comments1) / NULLIF(time_elapsed_minutes, 0) as comment_velocity
      FROM snapshot_pairs
      WHERE time_elapsed_minutes > 0
        AND score2 >= score1
        AND comments2 >= comments1
    `;

    try {
      const result = await db.execute(velocityQuery);
      const rows = result.rows as Array<{ score_velocity: number | null; comment_velocity: number | null }>;

      if (rows.length === 0) {
        errors.push(`No data for age bucket: ${bucket}`);
        continue;
      }

      // Extract velocities
      const scoreVelocities = rows
        .map(r => r.score_velocity)
        .filter((v): v is number => v !== null && v >= 0);

      const commentVelocities = rows
        .map(r => r.comment_velocity)
        .filter((v): v is number => v !== null && v >= 0);

      // Calculate and upsert benchmarks
      for (const metricType of metricTypes) {
        const values = metricType === 'score_velocity' ? scoreVelocities : commentVelocities;

        if (values.length < 10) {
          errors.push(`Insufficient data for ${bucket}/${metricType}: ${values.length} samples`);
          continue;
        }

        const percentiles = calculatePercentiles(values);

        await db
          .insert(growthBenchmarks)
          .values({
            ageBucket: bucket,
            metricType,
            p50: percentiles.p50.toString(),
            p75: percentiles.p75.toString(),
            p90: percentiles.p90.toString(),
            p95: percentiles.p95.toString(),
            p99: percentiles.p99.toString(),
            sampleSize: values.length,
            calculatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [growthBenchmarks.ageBucket, growthBenchmarks.metricType],
            set: {
              p50: percentiles.p50.toString(),
              p75: percentiles.p75.toString(),
              p90: percentiles.p90.toString(),
              p95: percentiles.p95.toString(),
              p99: percentiles.p99.toString(),
              sampleSize: values.length,
              calculatedAt: new Date(),
            },
          });

        benchmarksUpdated++;
      }
    } catch (error) {
      errors.push(`Error processing ${bucket}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { benchmarksUpdated, errors };
}

/**
 * Seed initial benchmarks with reasonable defaults
 * Used when there's not enough historical data
 */
export async function seedInitialBenchmarks(): Promise<void> {
  const defaultBenchmarks = [
    // New posts (0-30 min) - high volatility
    {
      ageBucket: 'new',
      metricType: 'score_velocity',
      p50: '0.5',
      p75: '1.0',
      p90: '2.0',
      p95: '3.5',
      p99: '6.0',
      sampleSize: 100,
    },
    {
      ageBucket: 'new',
      metricType: 'comment_velocity',
      p50: '0.1',
      p75: '0.3',
      p90: '0.6',
      p95: '1.0',
      p99: '2.0',
      sampleSize: 100,
    },
    // Young posts (30-120 min) - stabilizing
    {
      ageBucket: 'young',
      metricType: 'score_velocity',
      p50: '0.3',
      p75: '0.6',
      p90: '1.2',
      p95: '2.0',
      p99: '4.0',
      sampleSize: 100,
    },
    {
      ageBucket: 'young',
      metricType: 'comment_velocity',
      p50: '0.05',
      p75: '0.15',
      p90: '0.3',
      p95: '0.5',
      p99: '1.0',
      sampleSize: 100,
    },
    // Mature posts (120+ min) - slow growth
    {
      ageBucket: 'mature',
      metricType: 'score_velocity',
      p50: '0.1',
      p75: '0.2',
      p90: '0.5',
      p95: '0.8',
      p99: '1.5',
      sampleSize: 100,
    },
    {
      ageBucket: 'mature',
      metricType: 'comment_velocity',
      p50: '0.02',
      p75: '0.05',
      p90: '0.1',
      p95: '0.2',
      p99: '0.4',
      sampleSize: 100,
    },
  ];

  for (const benchmark of defaultBenchmarks) {
    await db
      .insert(growthBenchmarks)
      .values({
        ...benchmark,
        calculatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}
