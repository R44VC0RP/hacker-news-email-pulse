import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
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

    // Find the subscriber
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Email not found in our subscriber list' },
        { status: 404 }
      );
    }

    const sub = existing[0];
    
    if (!sub.isActive) {
      return NextResponse.json({
        message: 'Already unsubscribed',
        alreadyUnsubscribed: true,
      });
    }

    // Deactivate subscription
    await db
      .update(subscribers)
      .set({ 
        isActive: false, 
        unsubscribedAt: new Date() 
      })
      .where(eq(subscribers.email, email.toLowerCase()));

    return NextResponse.json({
      message: 'Successfully unsubscribed',
      success: true,
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

