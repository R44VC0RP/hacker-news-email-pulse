#!/usr/bin/env bun

/**
 * Development script to simulate cron jobs locally
 * Usage: bun run cron [job-name]
 *
 * Examples:
 *   bun run cron              - Run all cron jobs sequentially
 *   bun run cron fetch        - Run only fetch-posts
 *   bun run cron benchmarks   - Run only recalculate-benchmarks
 *   bun run cron digests      - Run only send-digests
 *   bun run cron init         - Initialize (seed benchmarks)
 */

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret-change-in-production';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';

interface CronJob {
  name: string;
  endpoint: string;
  description: string;
  method?: 'GET' | 'POST';
}

const jobs: Record<string, CronJob> = {
  fetch: {
    name: 'Fetch Posts',
    endpoint: '/api/cron/fetch-posts',
    description: 'Fetches new HN posts, creates snapshots, and detects alerts',
  },
  benchmarks: {
    name: 'Recalculate Benchmarks',
    endpoint: '/api/cron/recalculate-benchmarks',
    description: 'Recalculates percentile thresholds from historical data',
  },
  digests: {
    name: 'Send Digests',
    endpoint: '/api/cron/send-digests',
    description: 'Batches alerts into email digests',
  },
  init: {
    name: 'Initialize Benchmarks',
    endpoint: '/api/cron/fetch-posts',
    description: 'Seeds initial benchmark values (one-time setup)',
    method: 'POST',
  },
};

async function runCronJob(job: CronJob): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Running: ${job.name}`);
  console.log(`📝 ${job.description}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${job.endpoint}`, {
      method: job.method || 'GET',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success (${duration}ms)`);
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Failed (${response.status})`);
      console.error('\nError:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Request failed (${duration}ms)`);
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n💡 Make sure your dev server is running: bun dev');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jobName = args[0]?.toLowerCase();

  // Display help
  if (jobName === 'help' || jobName === '-h' || jobName === '--help') {
    console.log('Usage: bun run cron [job-name]\n');
    console.log('Available jobs:');
    Object.entries(jobs).forEach(([key, job]) => {
      console.log(`  ${key.padEnd(12)} - ${job.description}`);
    });
    console.log('\nExamples:');
    console.log('  bun run cron              - Run all jobs sequentially');
    console.log('  bun run cron fetch        - Run only fetch-posts');
    console.log('  bun run cron init         - Initialize (seed benchmarks)');
    return;
  }

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/dashboard/stats`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding correctly');
    }
  } catch (error) {
    console.error('❌ Cannot connect to dev server at', BASE_URL);
    console.error('💡 Make sure your dev server is running: bun dev\n');
    process.exit(1);
  }

  // Run specific job
  if (jobName && jobs[jobName]) {
    await runCronJob(jobs[jobName]);
    return;
  }

  // Run invalid job name
  if (jobName && !jobs[jobName]) {
    console.error(`❌ Unknown job: ${jobName}`);
    console.error('\nAvailable jobs:', Object.keys(jobs).join(', '));
    console.error('Run "bun run cron help" for more info\n');
    process.exit(1);
  }

  // Run all jobs sequentially
  console.log('🔄 Running all cron jobs sequentially...\n');

  for (const [key, job] of Object.entries(jobs)) {
    if (key === 'init') continue; // Skip init in "all" mode
    await runCronJob(job);

    // Add delay between jobs
    if (key !== 'digests') {
      console.log('\n⏳ Waiting 2 seconds before next job...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ All cron jobs completed successfully!');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
