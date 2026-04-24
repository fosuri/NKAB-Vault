"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageCircle, Eye, FileText, Activity, RefreshCw } from "lucide-react";
import { fetchUserStatsAction } from "@/lib/actions/user-stats";

interface UserStatisticsProps {
  userId: string;
}

export function UserStatistics({ userId }: UserStatisticsProps) {
  const [stats, setStats] = useState({ views: 0, likes: 0, dislikes: 0, comments: 0 });
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchUserStatsAction(userId);
      setStats(data.stats);
      setPostsCount(data.postsCount);
    } catch (error) {
      console.error("Failed to fetch user stats", error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  const totalReactions = stats.likes + stats.dislikes;
  const positivePercentage =
    totalReactions > 0 ? Math.round((stats.likes / totalReactions) * 100) : 0;

  let percentageColor = "text-muted-foreground";
  if (totalReactions > 0) {
    if (positivePercentage >= 75) {
      percentageColor = "text-green-500 text-shadow-glow-green";
    } else if (positivePercentage >= 50) {
      percentageColor = "text-yellow-500 text-shadow-glow-yellow";
    } else {
      percentageColor = "text-red-500 text-shadow-glow-red";
    }
  }

  if (loading) {
    return (
      <Card className="w-full animate-pulse border-border/50 bg-background/80 backdrop-blur shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/40 rounded-2xl w-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-border/50 bg-background/80 backdrop-blur shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl flex items-center gap-2 font-semibold">
          <Activity className="w-5 h-5 text-primary" />
          User Statistics
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadData(true)} 
          disabled={refreshing}
          className="h-8 gap-1.5 px-4 border-border/50 bg-background hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium">Update</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary transition-transform duration-300 group-hover:scale-110">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Posts</p>
              <p className="text-2xl font-bold tracking-tight">{postsCount}</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 transition-transform duration-300 group-hover:scale-110">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Views</p>
              <p className="text-2xl font-bold tracking-tight">{stats.views}</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-500 transition-transform duration-300 group-hover:scale-110">
              <ThumbsUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Likes</p>
              <p className="text-2xl font-bold tracking-tight">{stats.likes}</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 transition-transform duration-300 group-hover:scale-110">
              <ThumbsDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Dislikes</p>
              <p className="text-2xl font-bold tracking-tight">{stats.dislikes}</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 transition-transform duration-300 group-hover:scale-110">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Comments</p>
              <p className="text-2xl font-bold tracking-tight">{stats.comments}</p>
            </div>
          </div>

          <div className="relative overflow-hidden group flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
            <div className={`p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${totalReactions > 0 ? (positivePercentage >= 75 ? 'bg-green-500/10 text-green-500' : positivePercentage >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500') : 'bg-muted text-muted-foreground'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Rating</p>
              <p className={`text-2xl font-bold tracking-tight ${percentageColor}`}>
                {totalReactions > 0 ? `${positivePercentage}%` : "N/A"}
              </p>
            </div>
            {totalReactions > 0 && positivePercentage >= 75 && (
              <div className="absolute inset-0 bg-green-500/5 blur-xl pointer-events-none rounded-2xl" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
