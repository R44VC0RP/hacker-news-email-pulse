import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check for bot activity
    const verification = await checkBotId();
    if (verification.isBot) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      const sub = existing[0];
      if (sub.isActive) {
        return NextResponse.json(
          { message: 'Already subscribed', alreadySubscribed: true },
          { status: 200 }
        );
      }
      
      // Reactivate subscription
      await db
        .update(subscribers)
        .set({ isActive: true, unsubscribedAt: null })
        .where(eq(subscribers.email, email.toLowerCase()));

      return NextResponse.json({
        message: 'Welcome back! Subscription reactivated.',
        reactivated: true,
      });
    }

    // Create new subscriber
    await db.insert(subscribers).values({
      email: email.toLowerCase(),
      isActive: true,
      subscribedAt: new Date(),
    });

    return NextResponse.json({
      message: 'Subscribed successfully',
      success: true,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

