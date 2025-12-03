'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Post {
  id: number;
  title: string;
  url: string | null;
  author: string;
  postType: string;
  currentScore: number;
  currentComments: number;
  ageMinutes: number;
}

export function PostsTable() {
  const { data, isLoading, error } = useQuery<{ posts: Post[] }>({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/posts?limit=15');
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Growing Posts</CardTitle>
          <CardDescription>Currently tracked posts from the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <CardTitle>Top Growing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Failed to load posts: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const posts = data.posts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Growing Posts</CardTitle>
        <CardDescription>
          {posts.length} posts currently being tracked (last 24 hours)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No posts tracked yet. The cron job will start collecting data soon.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Age</TableHead>
                <TableHead>Author</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-md">
                    <a
                      href={post.url || `https://news.ycombinator.com/item?id=${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 hover:underline"
                    >
                      {post.title}
                    </a>
                    {post.postType !== 'story' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {post.postType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{post.currentScore}</TableCell>
                  <TableCell className="text-right">{post.currentComments}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {Math.floor(post.ageMinutes / 60)}h {post.ageMinutes % 60}m
                  </TableCell>
                  <TableCell className="text-muted-foreground">{post.author}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
