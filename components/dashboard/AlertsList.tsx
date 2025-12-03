'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: number;
  postId: number;
  alertType: string;
  percentile: number;
  growthRate: number;
  scoreAtAlert: number;
  commentsAtAlert: number;
  postAgeMinutes: number;
  detectedAt: string;
  isSent: boolean;
  post: {
    id: number;
    title: string;
    url: string | null;
    author: string;
    postType: string;
  };
}

export function AlertsList() {
  const { data, isLoading, error } = useQuery<{ alerts: Alert[] }>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/alerts?limit=10');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Breakout posts detected in the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Failed to load alerts: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = data.alerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>
          {alerts.length} breakout {alerts.length === 1 ? 'post' : 'posts'} detected in the last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alerts yet. The system will detect breakout posts as they gain traction.
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <a
                      href={alert.post.url || `https://news.ycombinator.com/item?id=${alert.postId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-orange-600 hover:underline"
                    >
                      {alert.post.title}
                    </a>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={alert.alertType === 'breakthrough' ? 'destructive' : 'default'}>
                        {Math.round(alert.percentile)}th percentile
                      </Badge>
                      {alert.alertType === 'breakthrough' && (
                        <Badge variant="destructive">BREAKTHROUGH</Badge>
                      )}
                      <Badge variant="outline">
                        {alert.scoreAtAlert} points
                      </Badge>
                      <Badge variant="outline">
                        {alert.commentsAtAlert} comments
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      By {alert.post.author} • {Math.round(alert.growthRate * 10) / 10} {alert.alertType.includes('score') ? 'pts' : 'comments'}/min •{' '}
                      {formatDistanceToNow(new Date(alert.detectedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <a
                    href={`https://news.ycombinator.com/item?id=${alert.postId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline whitespace-nowrap"
                  >
                    View on HN →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
