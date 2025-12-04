import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface AlertData {
  id: number;
  postId: number;
  alertType: string;
  percentile: string;
  growthRate: string;
  scoreAtAlert: number;
  commentsAtAlert: number;
  postAgeMinutes: number;
  detectedAt: Date;
  post: {
    title: string;
    url: string | null;
    author: string;
  };
}

interface DigestEmailProps {
  alerts?: AlertData[];
  digestDate?: Date;
  subscriberEmail?: string;
  baseUrl?: string;
}

// Preview data for React Email dev server
const previewAlerts: AlertData[] = [
  {
    id: 1,
    postId: 38544729,
    alertType: 'breakthrough',
    percentile: '99.2',
    growthRate: '4.82',
    scoreAtAlert: 312,
    commentsAtAlert: 89,
    postAgeMinutes: 47,
    detectedAt: new Date(),
    post: {
      title: 'Show HN: I built a tool that detects breakout stories on Hacker News',
      url: 'https://github.com/example/hn-pulse',
      author: 'pg',
    },
  },
  {
    id: 2,
    postId: 38544801,
    alertType: 'score_velocity',
    percentile: '97.5',
    growthRate: '3.21',
    scoreAtAlert: 187,
    commentsAtAlert: 42,
    postAgeMinutes: 63,
    detectedAt: new Date(),
    post: {
      title: 'Why SQLite is so great for embedded applications',
      url: 'https://sqlite.org/whentouse.html',
      author: 'dang',
    },
  },
  {
    id: 3,
    postId: 38544912,
    alertType: 'comment_velocity',
    percentile: '95.1',
    growthRate: '2.15',
    scoreAtAlert: 94,
    commentsAtAlert: 156,
    postAgeMinutes: 82,
    detectedAt: new Date(),
    post: {
      title: 'Ask HN: What are you working on this weekend?',
      url: null,
      author: 'whoishiring',
    },
  },
];

function getDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function DigestEmail({
  alerts = previewAlerts,
  digestDate = new Date(),
  subscriberEmail = 'preview@example.com',
  baseUrl = 'https://hn.ryan.ceo',
}: DigestEmailProps) {
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;
  const previewText = `${alerts.length} breakout ${alerts.length === 1 ? 'story' : 'stories'} on HN`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                hn: {
                  orange: '#ff6600',
                  cream: '#f6f6ef',
                  gray: '#828282',
                },
              },
              fontFamily: {
                verdana: ['Verdana', 'Geneva', 'sans-serif'],
              },
            },
          },
        }}
      >
        <Body className="bg-hn-cream font-verdana">
          <Container className="max-w-[600px] p-4 ">
            {/* Header */}
            <Text className="m-0 mb-1 text-[13px] font-bold text-black">
              <span className="mr-1.5 bg-hn-orange px-1.5 py-0.5 font-bold text-white">Y</span>
              Hacker News Pulse
            </Text>
            <Text className="m-0 mb-3 text-[11px] text-hn-gray">
              {alerts.length} breakout {alerts.length === 1 ? 'story' : 'stories'} · {digestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>

            <Hr className="my-3 border-hn-orange" />

            {/* Stories */}
            {alerts.map((alert, index) => {
              const domain = getDomain(alert.post.url);
              const hnUrl = `https://news.ycombinator.com/item?id=${alert.postId}`;

              return (
                <React.Fragment key={alert.id}>
                  <Text className="m-0 text-[13px] leading-[18px] text-black">
                    <span className="text-hn-gray">{index + 1}.</span>{' '}
                    <Link href={alert.post.url || hnUrl} className="text-black no-underline">
                      {alert.post.title}
                    </Link>
                    {domain && <span className="text-[11px] text-hn-gray"> ({domain})</span>}
                  </Text>
                  <Text className="m-0 pl-[18px] text-[9px] text-hn-gray">
                    {alert.scoreAtAlert} pts · {alert.post.author} · {formatAge(alert.postAgeMinutes)} ·{' '}
                    <Link href={hnUrl} className="text-hn-gray no-underline">{alert.commentsAtAlert} comments</Link>
                    {' '}· <span className="font-bold text-hn-orange">{parseFloat(alert.percentile).toFixed(0)}th pctl</span>
                    {alert.alertType === 'breakthrough' && <span className="text-[11px]"> 🔥</span>}
                  </Text>
                  {index < alerts.length - 1 && <Hr className="my-1.5 border-neutral-200" />}
                </React.Fragment>
              );
            })}

            <Hr className="my-3 border-hn-orange" />

            <Text className="m-0 text-[9px] text-hn-gray">
              <Link href="https://inbound.new?utm_source=hnpulse&utm_medium=email&utm_campaign=digest" className="text-hn-gray no-underline">powered by inbound</Link>
              {' · '}
              <Link href={unsubscribeUrl} className="text-hn-gray no-underline">unsubscribe</Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
