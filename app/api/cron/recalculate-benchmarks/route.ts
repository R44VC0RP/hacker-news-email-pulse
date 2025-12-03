import { NextRequest, NextResponse } from 'next/server';
import { recalculateBenchmarks } from '@/lib/analysis/benchmarks';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Recalculate growth benchmarks from historical data
 * Runs daily at 2 AM UTC via Vercel cron
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

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized benchmark recalculation request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== Benchmark Recalculation Started ===');

    // Recalculate benchmarks
    const result = await recalculateBenchmarks();

    const executionTime = Date.now() - startTime;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      benchmarks_updated: result.benchmarksUpdated,
      errors: result.errors,
    };

    console.log('=== Benchmark Recalculation Completed ===');
    console.log(JSON.stringify(summary, null, 2));

    // Log warnings if there were errors
    if (result.errors.length > 0) {
      console.warn('Encountered errors during benchmark calculation:');
      result.errors.forEach(error => console.warn(`  - ${error}`));
    }

    return NextResponse.json(summary);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('=== Benchmark Recalculation Failed ===');
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
