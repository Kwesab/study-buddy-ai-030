import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface ContentItem {
  id: string;
  content_type: string;
  content: any;
  created_at: string;
  uploads?: { file_name: string } | null;
}

export default function SummariesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("generated_content")
      .select("*, uploads(file_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as any[]) || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const summaries = items.filter(i => i.content_type === "summary");
  const notes = items.filter(i => i.content_type === "notes");
  const guides = items.filter(i => i.content_type === "study_guide");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Summaries & Notes</h1>
        <p className="text-muted-foreground mt-1">Your AI-generated study materials</p>
      </div>

      <Tabs defaultValue="summaries">
        <TabsList>
          <TabsTrigger value="summaries">Summaries ({summaries.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="guides">Study Guides ({guides.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summaries" className="mt-4 space-y-4">
          {summaries.length === 0 && <EmptyState text="No summaries yet. Upload slides and generate a summary!" />}
          {summaries.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg">{item.content?.title || "Summary"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{item.uploads?.file_name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground">{item.content?.summary}</p>
                  {item.content?.key_points && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">Key Points</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {item.content.key_points.map((p: string, j: number) => <li key={j}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {item.content?.key_terms && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">Key Terms</h4>
                      <div className="space-y-1">
                        {item.content.key_terms.map((t: any, j: number) => (
                          <p key={j} className="text-sm"><span className="font-medium text-primary">{t.term}:</span> <span className="text-muted-foreground">{t.definition}</span></p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          {notes.length === 0 && <EmptyState text="No notes yet. Upload slides and generate study notes!" />}
          {notes.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg">{item.content?.title || "Study Notes"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{item.uploads?.file_name}</p>
                </CardHeader>
                <CardContent>
                  {item.content?.sections?.map((section: any, j: number) => (
                    <div key={j} className="mb-4">
                      <h4 className="font-medium text-foreground mb-1">{section.heading}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{section.content}</p>
                      {section.bullet_points && (
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                          {section.bullet_points.map((p: string, k: number) => <li key={k}>{p}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="guides" className="mt-4 space-y-4">
          {guides.length === 0 && <EmptyState text="No study guides yet. Upload slides and generate one!" />}
          {guides.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg">{item.content?.title || "Study Guide"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.content?.learning_objectives && (
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-1">Learning Objectives</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {item.content.learning_objectives.map((o: string, j: number) => <li key={j}>{o}</li>)}
                      </ul>
                    </div>
                  )}
                  {item.content?.study_plan?.map((plan: any, j: number) => (
                    <div key={j} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm text-foreground">{plan.topic} <span className="text-muted-foreground">({plan.duration_minutes} min)</span></p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                        {plan.activities?.map((a: string, k: number) => <li key={k}>{a}</li>)}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
