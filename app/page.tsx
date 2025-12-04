'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Subscribed!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to subscribe');
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
            Get 2-3 emails/day with breakout HN stories
          </p>
        </div>

        {/* Signup Form */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="flex-1 px-2 py-1 text-[13px] border border-[#828282] bg-white text-black placeholder:text-[#828282] focus:outline-none focus:border-[#ff6600]"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-3 py-1 text-[11px] font-bold bg-[#ff6600] text-white hover:bg-[#e55a00] disabled:opacity-50"
            >
              {status === 'loading' ? '...' : 'subscribe'}
            </button>
          </form>
          {status !== 'idle' && status !== 'loading' && (
            <p className={`text-[11px] mt-1 ${status === 'success' ? 'text-[#228b22]' : 'text-[#ff0000]'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-[#ff6600] mb-6" />

        {/* Email Preview */}
        <div className="mb-4">
          <p className="text-[11px] text-[#828282] mb-3">example digest:</p>
          
          {/* Mock Email */}
          <div className="border border-[#e0e0e0] bg-white p-4">
            <p className="text-[13px] font-bold text-black mb-1">
              <span className="bg-[#ff6600] text-white px-1.5 py-0.5 mr-1.5 font-bold text-[11px]">Y</span>
              Hacker News Pulse
            </p>
            <p className="text-[11px] text-[#828282] mb-3">
              3 breakout stories · Dec 4
            </p>

            <hr className="border-[#ff6600] mb-3" />

            {/* Story 1 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">1.</span>{' '}
              <span className="text-black">Show HN: I built a tool that detects breakout stories</span>
              <span className="text-[11px] text-[#828282]"> (github.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              312 pts · pg · 47m · 89 comments · <span className="font-bold text-[#ff6600]">99th pctl</span> 🔥
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 2 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">2.</span>{' '}
              <span className="text-black">Why SQLite is so great for embedded applications</span>
              <span className="text-[11px] text-[#828282]"> (sqlite.org)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              187 pts · dang · 1h · 42 comments · <span className="font-bold text-[#ff6600]">98th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 3 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">3.</span>{' '}
              <span className="text-black">Ask HN: What are you working on this weekend?</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px]">
              94 pts · whoishiring · 1h · 156 comments · <span className="font-bold text-[#ff6600]">95th pctl</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[9px] text-[#828282]">
          <a href="https://news.ycombinator.com" className="text-[#828282] no-underline hover:underline">news.ycombinator.com</a>
        </p>
      </div>
    </div>
  );
}
