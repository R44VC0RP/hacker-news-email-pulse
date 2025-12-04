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
              8 breakout stories · Dec 4
            </p>

            <hr className="border-[#ff6600] mb-3" />

            {/* Story 1 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">1.</span>{' '}
              <span className="text-black">Ghostty is now non-profit</span>
              <span className="text-[11px] text-[#828282]"> (mitchellh.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              738 pts · vrnvu · 6h · 146 comments · <span className="font-bold text-[#ff6600]">99th pctl</span> 🔥
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 2 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">2.</span>{' '}
              <span className="text-black">Everyone in Seattle hates AI</span>
              <span className="text-[11px] text-[#828282]"> (jonready.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              569 pts · mips_avatar · 5h · 531 comments · <span className="font-bold text-[#ff6600]">99th pctl</span> 🔥
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 3 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">3.</span>{' '}
              <span className="text-black">Reverse engineering a $1B Legal AI tool exposed 100k+ confidential files</span>
              <span className="text-[11px] text-[#828282]"> (alexschapiro.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              479 pts · bearsyankees · 7h · 156 comments · <span className="font-bold text-[#ff6600]">98th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 4 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">4.</span>{' '}
              <span className="text-black">Valve reveals it&apos;s the architect behind a push to bring Windows games to Arm</span>
              <span className="text-[11px] text-[#828282]"> (theverge.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              405 pts · evolve2k · 7h · 449 comments · <span className="font-bold text-[#ff6600]">97th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 5 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">5.</span>{' '}
              <span className="text-black">RCE Vulnerability in React and Next.js</span>
              <span className="text-[11px] text-[#828282]"> (github.com/vercel)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              390 pts · rayhaanj · 9h · 123 comments · <span className="font-bold text-[#ff6600]">97th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 6 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">6.</span>{' '}
              <span className="text-black">Micron Announces Exit from Crucial Consumer Business</span>
              <span className="text-[11px] text-[#828282]"> (micron.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              338 pts · simlevesque · 7h · 157 comments · <span className="font-bold text-[#ff6600]">96th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 7 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">7.</span>{' '}
              <span className="text-black">1D Conway&apos;s Life glider found, 3.7B cells long</span>
              <span className="text-[11px] text-[#828282]"> (conwaylife.com)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-2">
              318 pts · nooks · 8h · 114 comments · <span className="font-bold text-[#ff6600]">96th pctl</span>
            </p>

            <hr className="border-[#e0e0e0] my-1.5" />

            {/* Story 8 */}
            <p className="text-[13px] text-black leading-[18px] mb-0">
              <span className="text-[#828282]">8.</span>{' '}
              <span className="text-black">Show HN: I built a dashboard to compare mortgage rates across 120 credit unions</span>
              <span className="text-[11px] text-[#828282]"> (finfam.app)</span>
            </p>
            <p className="text-[9px] text-[#828282] pl-[18px] mb-3">
              109 pts · mhashemi · 4h · 42 comments · <span className="font-bold text-[#ff6600]">95th pctl</span>
            </p>

            <hr className="border-[#ff6600] my-3" />

            <p className="text-[9px] text-[#828282]">
              <a href="https://inbound.new?utm_source=hnpulse&utm_medium=email&utm_campaign=digest" className="text-[#828282] no-underline hover:underline">powered by inbound</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[9px] text-[#828282]">
          <a href="https://news.ycombinator.com" className="text-[#828282] no-underline hover:underline">news.ycombinator.com</a>
          {' · '}
          <a href="https://inbound.new?utm_source=hnpulse&utm_medium=web&utm_campaign=homepage" className="text-[#828282] no-underline hover:underline">powered by inbound</a>
        </p>
      </div>
    </div>
  );
}
