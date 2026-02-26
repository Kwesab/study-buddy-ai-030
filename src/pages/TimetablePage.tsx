import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, CalendarDays, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimetableEntry {
  id: string;
  title: string;
  entry_type: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
}

interface StudyPlan {
  id: string;
  plan_data: any;
  created_at: string;
}

export default function TimetablePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", entry_type: "academic", day_of_week: "1", start_time: "09:00", end_time: "10:00", location: "", notes: "",
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [entriesRes, planRes] = await Promise.all([
      supabase.from("timetable_entries").select("*").eq("user_id", user!.id).order("day_of_week").order("start_time"),
      supabase.from("study_plans").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1),
    ]);
    setEntries((entriesRes.data as TimetableEntry[]) || []);
    setStudyPlan((planRes.data as StudyPlan[])?.[0] || null);
    setLoading(false);
  };

  const addEntry = async () => {
    const { error } = await supabase.from("timetable_entries").insert({
      user_id: user!.id,
      title: form.title,
      entry_type: form.entry_type,
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location || null,
      notes: form.notes || null,
    });
    if (error) { toast.error("Failed to add entry"); return; }
    toast.success("Entry added");
    setDialogOpen(false);
    setForm({ title: "", entry_type: "academic", day_of_week: "1", start_time: "09:00", end_time: "10:00", location: "", notes: "" });
    loadData();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("timetable_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const generateStudyPlan = async () => {
    if (entries.length === 0) { toast.error("Add timetable entries first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {
        body: { entries },
      });
      if (error) throw error;
      toast.success("Study plan generated!");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const entriesByDay = DAYS.map((day, i) => ({
    day,
    items: entries.filter((e) => e.day_of_week === i),
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Timetable & Study Plan</h1>
          <p className="text-muted-foreground mt-1">Manage your schedule and get an AI study plan</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Schedule Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Physics Lecture" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div><Label>Location (optional)</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <Button onClick={addEntry} disabled={!form.title} className="w-full">Add Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={generateStudyPlan} disabled={generating || entries.length === 0}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Study Plan
          </Button>
        </div>
      </div>

      {/* Weekly timetable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {entriesByDay.filter((d) => d.items.length > 0).map((d, i) => (
          <motion.div key={d.day} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">{d.day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {d.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2 rounded-lg bg-muted text-sm group">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}</p>
                      {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">{item.entry_type}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => deleteEntry(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {entries.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No schedule entries yet. Add your lectures, exams, and personal commitments.</p>
          </CardContent>
        </Card>
      )}

      {/* AI Study Plan */}
      {studyPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> AI Study Plan
              </CardTitle>
              <p className="text-xs text-muted-foreground">Generated {new Date(studyPlan.created_at).toLocaleDateString()}</p>
            </CardHeader>
            <CardContent>
              {studyPlan.plan_data?.schedule ? (
                <div className="space-y-4">
                  {studyPlan.plan_data.schedule.map((block: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm text-foreground">{block.day || block.topic}</p>
                        {block.time && <Badge variant="outline" className="text-xs">{block.time}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{block.activity || block.description}</p>
                      {block.tips && <p className="text-xs text-muted-foreground mt-1 italic">💡 {block.tips}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{JSON.stringify(studyPlan.plan_data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
