import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailDigests, subscribers } from '@/lib/db/schema';
import { getUnsentAlerts, markAlertsAsSent } from '@/lib/analysis/alerts';
import { render } from '@react-email/components';
import DigestEmail from '@/emails/digest';
import { gte, eq } from 'drizzle-orm';
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

    // Step 4: Get all active subscribers
    const alertIds = unsentAlerts.map(a => a.id);
    const activeSubscribers = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.isActive, true));

    console.log(`Found ${activeSubscribers.length} active subscribers`);

    let emailStatus: 'sent' | 'failed' | 'partial' = 'failed';
    let sentCount = 0;
    let failedCount = 0;

    const inboundApiKey = process.env.INBOUND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const baseUrl = "https://hn.ryan.ceo";

    if (inboundApiKey && emailFrom && activeSubscribers.length > 0) {
      const inbound = new Inbound({ apiKey: inboundApiKey });

      // Use top story title as subject
      const topStory = unsentAlerts[0];
      const otherCount = unsentAlerts.length - 1;
      const subject = otherCount > 0
        ? `${topStory.post.title} (+${otherCount} more)`
        : topStory.post.title;

      // Send personalized email to each subscriber
      for (const subscriber of activeSubscribers) {
        try {
          // Render personalized email with subscriber's unsubscribe link
          const emailHtml = await render(
            DigestEmail({
              alerts: unsentAlerts,
              digestDate: new Date(),
              subscriberEmail: subscriber.email,
              baseUrl,
            })
          );

          await inbound.emails.send({
            from: emailFrom,
            to: [subscriber.email],
            subject,
            html: emailHtml,
          });
          sentCount++;
          console.log(`Email sent to ${subscriber.email}`);
        } catch (emailError) {
          failedCount++;
          console.error(`Failed to send to ${subscriber.email}:`, emailError);
        }
      }

      if (sentCount === activeSubscribers.length) {
        emailStatus = 'sent';
      } else if (sentCount > 0) {
        emailStatus = 'partial';
      } else {
        emailStatus = 'failed';
      }

      console.log(`Sent ${sentCount}/${activeSubscribers.length} emails`);
    } else if (activeSubscribers.length === 0) {
      console.warn('No active subscribers');
      emailStatus = 'sent'; // Nothing to send, consider it success
    } else {
      console.warn('Email not configured - missing INBOUND_API_KEY or EMAIL_FROM');
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
      subscribers: {
        total: activeSubscribers.length,
        sent: sentCount,
        failed: failedCount,
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
