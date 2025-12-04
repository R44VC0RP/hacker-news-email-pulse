'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Successfully unsubscribed');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to unsubscribe');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6ef] font-[Verdana,Geneva,sans-serif]">
      <div className="max-w-[600px] p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[13px] font-bold text-black mb-1">
            <span className="bg-[#ff6600] text-white px-1.5 py-0.5 mr-1.5 font-bold">Y</span>
            Hacker News Pulse
          </h1>
          <p className="text-[11px] text-[#828282]">
            Unsubscribe from email updates
          </p>
        </div>

        {/* Divider */}
        <hr className="border-[#ff6600] mb-6" />

        {status === 'success' ? (
          <div className="mb-8">
            <div className="border border-[#e0e0e0] bg-white p-4">
              <p className="text-[13px] text-black mb-3">
                ✓ You&apos;ve been unsubscribed
              </p>
              <p className="text-[11px] text-[#828282] mb-4">
                {email} will no longer receive HN Pulse digests.
              </p>
              <hr className="border-[#e0e0e0] my-3" />
              <p className="text-[11px] text-[#828282]">
                Changed your mind?{' '}
                <a href="/" className="text-[#ff6600] hover:underline">
                  Resubscribe here
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="border border-[#e0e0e0] bg-white p-4">
              <p className="text-[13px] text-black mb-3">
                Confirm unsubscribe
              </p>
              <p className="text-[11px] text-[#828282] mb-4">
                Click below to stop receiving HN Pulse breakout story digests.
              </p>
              
              <form onSubmit={handleUnsubscribe} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="px-2 py-1.5 text-[13px] border border-[#828282] bg-white text-black placeholder:text-[#828282] focus:outline-none focus:border-[#ff6600]"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-3 py-1.5 text-[11px] font-bold bg-[#828282] text-white hover:bg-[#666666] disabled:opacity-50 w-fit"
                >
                  {status === 'loading' ? 'unsubscribing...' : 'unsubscribe'}
                </button>
              </form>
              
              {status === 'error' && (
                <p className="text-[11px] mt-3 text-[#ff0000]">
                  {message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-[#ff6600] mb-6" />

        {/* Footer */}
        <p className="text-[9px] text-[#828282]">
          <a href="/" className="text-[#828282] no-underline hover:underline">← back to HN Pulse</a>
          {' · '}
          <a href="https://news.ycombinator.com" className="text-[#828282] no-underline hover:underline">news.ycombinator.com</a>
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f6ef] font-[Verdana,Geneva,sans-serif]">
        <div className="max-w-[600px] p-4">
          <div className="mb-6">
            <h1 className="text-[13px] font-bold text-black mb-1">
              <span className="bg-[#ff6600] text-white px-1.5 py-0.5 mr-1.5 font-bold">Y</span>
              Hacker News Pulse
            </h1>
            <p className="text-[11px] text-[#828282]">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

