import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailDigests } from '@/lib/db/schema';
import { getUnsentAlerts, markAlertsAsSent } from '@/lib/analysis/alerts';
import { render } from '@react-email/components';
import DigestEmail from '@/lib/email/templates/digest';
import { gte } from 'drizzle-orm';
import { startOfDay } from 'date-fns';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Send digest emails with batched alerts
 * Runs every 4 hours via Vercel cron
 * Max 5 digests per day
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
      console.warn('Unauthorized digest send request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== Send Digests Cron Started ===');

    // Step 1: Check daily quota
    const maxDigestsPerDay = parseInt(process.env.MAX_DIGESTS_PER_DAY || '5', 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const digestsSentToday = await db
      .select()
      .from(emailDigests)
      .where(
        gte(emailDigests.sentAt, today)
      );

    console.log(`Digests sent today: ${digestsSentToday.length}/${maxDigestsPerDay}`);

    if (digestsSentToday.length >= maxDigestsPerDay) {
      console.log('Daily quota reached, skipping digest');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Daily quota reached',
        quota: {
          sent: digestsSentToday.length,
          max: maxDigestsPerDay,
        },
      });
    }

    // Step 2: Fetch unsent alerts
    const batchSize = parseInt(process.env.DIGEST_BATCH_SIZE || '10', 10);
    const unsentAlerts = await getUnsentAlerts(batchSize);

    console.log(`Found ${unsentAlerts.length} unsent alerts`);

    if (unsentAlerts.length === 0) {
      console.log('No alerts to send');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No unsent alerts',
      });
    }

    // Step 3: Determine digest type based on alert percentiles
    const hasUrgentAlerts = unsentAlerts.some(
      alert => parseFloat(alert.percentile) >= 99
    );

    const digestType = hasUrgentAlerts ? 'urgent' : 'hourly';

    console.log(`Creating ${digestType} digest with ${unsentAlerts.length} alerts`);

    // Step 4: Render email template
    const emailHtml = await render(
      DigestEmail({
        alerts: unsentAlerts,
        digestDate: new Date(),
      })
    );

    // Step 5: Create digest record (email sending deferred to future implementation)
    const alertIds = unsentAlerts.map(a => a.id);

    await db.insert(emailDigests).values({
      sentAt: new Date(),
      alertIds,
      alertCount: unsentAlerts.length,
      digestType,
      status: 'pending', // Will be 'sent' when we integrate with inbound.new
    });

    // Step 6: Mark alerts as sent
    await markAlertsAsSent(alertIds);

    console.log('Email digest queued successfully');

    // TODO: When ready to send emails, integrate with inbound.new here
    // Example:
    // await fetch('https://api.inbound.new/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.INBOUND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: process.env.EMAIL_FROM,
    //     to: process.env.EMAIL_TO,
    //     subject: `HN Pulse: ${unsentAlerts.length} breakout stories`,
    //     html: emailHtml,
    //   }),
    // });

    const executionTime = Date.now() - startTime;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      digest: {
        type: digestType,
        alerts_count: unsentAlerts.length,
        status: 'queued',
      },
      quota: {
        sent: digestsSentToday.length + 1,
        max: maxDigestsPerDay,
      },
    };

    console.log('=== Send Digests Cron Completed ===');
    console.log(JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('=== Send Digests Cron Failed ===');
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
