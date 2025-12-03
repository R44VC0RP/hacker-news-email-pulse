import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
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
  alerts: AlertData[];
  digestDate: Date;
}

export default function DigestEmail({ alerts = [], digestDate = new Date() }: DigestEmailProps) {
  const previewText = `${alerts.length} breakout ${alerts.length === 1 ? 'story' : 'stories'} detected on Hacker News`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hacker News Pulse Digest</Heading>
          <Text style={text}>
            {alerts.length} breakout {alerts.length === 1 ? 'story' : 'stories'} detected
          </Text>
          <Text style={dateText}>
            {digestDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>

          <Hr style={hr} />

          {alerts.map((alert, index) => (
            <Section key={alert.id} style={alertSection}>
              <Heading style={h2}>
                {index + 1}. {alert.post.title}
              </Heading>

              <Text style={metadata}>
                <strong>By:</strong> {alert.post.author} •{' '}
                <strong>Score:</strong> {alert.scoreAtAlert} •{' '}
                <strong>Comments:</strong> {alert.commentsAtAlert}
              </Text>

              <Text style={growthStats}>
                <span style={badge}>
                  {parseFloat(alert.percentile).toFixed(0)}th percentile
                </span>{' '}
                {alert.alertType === 'breakthrough' && (
                  <span style={{ ...badge, ...breakthroughBadge }}>BREAKTHROUGH</span>
                )}
              </Text>

              <Text style={stats}>
                Growth Rate: {parseFloat(alert.growthRate).toFixed(2)}{' '}
                {alert.alertType.includes('score') ? 'points' : 'comments'}/min •{' '}
                Age: {Math.floor(alert.postAgeMinutes)} minutes
              </Text>

              <Link
                href={alert.post.url || `https://news.ycombinator.com/item?id=${alert.postId}`}
                style={button}
              >
                {alert.post.url ? 'Read Article' : 'View Discussion'}
              </Link>
              <Text style={linkText}>
                <Link
                  href={`https://news.ycombinator.com/item?id=${alert.postId}`}
                  style={secondaryLink}
                >
                  View on Hacker News
                </Link>
              </Text>

              {index < alerts.length - 1 && <Hr style={hr} />}
            </Section>
          ))}

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this digest because you enabled Hacker News Pulse alerts.
            <br />
            <Link href="https://news.ycombinator.com" style={footerLink}>
              Visit Hacker News
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 40px 10px',
  textAlign: 'center' as const,
};

const dateText = {
  color: '#666',
  fontSize: '14px',
  margin: '0 40px 20px',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const alertSection = {
  padding: '0 40px',
  marginBottom: '20px',
};

const h2 = {
  color: '#ff6600',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const metadata = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 10px',
};

const growthStats = {
  margin: '10px 0',
};

const badge = {
  backgroundColor: '#ff6600',
  color: '#ffffff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold' as const,
  marginRight: '8px',
};

const breakthroughBadge = {
  backgroundColor: '#dc2626',
};

const stats = {
  color: '#666',
  fontSize: '13px',
  margin: '10px 0 15px',
};

const button = {
  backgroundColor: '#ff6600',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  marginTop: '10px',
};

const linkText = {
  margin: '8px 0',
};

const secondaryLink = {
  color: '#666',
  fontSize: '13px',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '20px 40px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};
