import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, RefreshCw, Youtube, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface VideoRec {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  channel_name: string | null;
  relevance_score: number;
  reason: string | null;
  watched: boolean;
}

export function VideosTab({ uploadId }: { uploadId: string }) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const loadCached = async () => {
    const { data } = await supabase
      .from("video_recommendations")
      .select("*")
      .eq("upload_id", uploadId)
      .order("relevance_score", { ascending: false });
    setVideos((data as VideoRec[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  const fetchNew = async (refresh = false) => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-videos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ uploadId, refresh }),
        },
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed");
      setVideos(json.videos || []);
      toast.success(refresh ? "Videos refreshed" : "Videos loaded");
    } catch (e: any) {
      toast.error(e.message || "Could not load videos");
    } finally {
      setFetching(false);
    }
  };

  const toggleWatched = async (v: VideoRec) => {
    const next = !v.watched;
    await supabase.from("video_recommendations").update({ watched: next }).eq("id", v.id);
    setVideos((prev) => prev.map((p) => (p.id === v.id ? { ...p, watched: next } : p)));
    if (next && user) {
      // Log ~10 min as study time for a watched video
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        upload_id: uploadId,
        duration_minutes: 10,
        session_type: "video",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <Youtube className="w-10 h-10 mx-auto text-muted-foreground/60" />
        <p className="text-muted-foreground text-sm">
          No videos yet. Let AI find educational YouTube videos for this topic.
        </p>
        <Button onClick={() => fetchNew(false)} disabled={fetching}>
          {fetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
          Find videos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {videos.filter((v) => v.watched).length}/{videos.length} watched
        </p>
        <Button size="sm" variant="outline" onClick={() => fetchNew(true)} disabled={fetching}>
          {fetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <Card key={v.id} className="border-border/50 overflow-hidden">
            <a
              href={`https://www.youtube.com/watch?v=${v.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-video bg-muted"
            >
              {v.thumbnail && (
                <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors">
                <PlayCircle className="w-12 h-12 text-white drop-shadow" />
              </div>
              <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                {v.relevance_score}%
              </Badge>
            </a>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium line-clamp-2">{v.title}</p>
              {v.channel_name && (
                <p className="text-xs text-muted-foreground">{v.channel_name}</p>
              )}
              {v.reason && (
                <p className="text-xs text-muted-foreground italic line-clamp-2">"{v.reason}"</p>
              )}
              <Button
                size="sm"
                variant={v.watched ? "default" : "outline"}
                className="w-full h-8"
                onClick={() => toggleWatched(v)}
              >
                {v.watched ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Watched</>
                ) : (
                  "Mark as watched"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}