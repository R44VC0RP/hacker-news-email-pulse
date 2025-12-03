import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailDigests } from '@/lib/db/schema';
import { getUnsentAlerts, markAlertsAsSent } from '@/lib/analysis/alerts';
import { render } from '@react-email/components';
import DigestEmail from '@/lib/email/templates/digest';
import { gte } from 'drizzle-orm';
import Inbound from 'inboundemail';

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

    // Step 5: Send email via Inbound
    const alertIds = unsentAlerts.map(a => a.id);
    let emailStatus: 'sent' | 'failed' = 'failed';

    const inboundApiKey = process.env.INBOUND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const emailTo = process.env.EMAIL_TO;

    if (inboundApiKey && emailFrom && emailTo) {
      try {
        const inbound = new Inbound({ apiKey: inboundApiKey });

        const subject = hasUrgentAlerts
          ? `🔥 HN Pulse: ${unsentAlerts.length} URGENT breakout ${unsentAlerts.length === 1 ? 'story' : 'stories'}`
          : `📈 HN Pulse: ${unsentAlerts.length} breakout ${unsentAlerts.length === 1 ? 'story' : 'stories'}`;

        await inbound.emails.send({
          from: emailFrom,
          to: [emailTo],
          subject,
          html: emailHtml,
        });

        emailStatus = 'sent';
        console.log(`Email sent successfully to ${emailTo}`);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        emailStatus = 'failed';
      }
    } else {
      console.warn('Email not configured - missing INBOUND_API_KEY, EMAIL_FROM, or EMAIL_TO');
      emailStatus = 'failed';
    }

    // Step 6: Create digest record
    await db.insert(emailDigests).values({
      sentAt: new Date(),
      alertIds,
      alertCount: unsentAlerts.length,
      digestType,
      status: emailStatus,
    });

    // Step 7: Mark alerts as sent (regardless of email status to avoid re-sending)
    await markAlertsAsSent(alertIds);

    console.log(`Email digest ${emailStatus === 'sent' ? 'sent' : 'queued (email failed)'} successfully`);

    const executionTime = Date.now() - startTime;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      digest: {
        type: digestType,
        alerts_count: unsentAlerts.length,
        email_status: emailStatus,
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
