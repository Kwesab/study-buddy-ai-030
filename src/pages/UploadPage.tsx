import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { analyzeSlides } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload as UploadIcon, Loader2, BookOpen, CreditCard, HelpCircle, FileCheck, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const ALL_ACTIONS = [
  { action: "summary", label: "Summary", icon: FileCheck, desc: "Concise lecture summary" },
  { action: "notes", label: "Study Notes", icon: BookOpen, desc: "Structured notes" },
  { action: "flashcards", label: "Flashcards", icon: CreditCard, desc: "Q&A flashcards" },
  { action: "quiz", label: "Quiz", icon: HelpCircle, desc: "Exam questions" },
  { action: "study_guide", label: "Study Guide", icon: FileText, desc: "Complete study guide" },
];

export default function UploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Auto-generation state
  const [generating, setGenerating] = useState(false);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [slideText, setSlideText] = useState("");
  // Manual generation after auto
  const [manualGenerating, setManualGenerating] = useState<string | null>(null);

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "text/plain") {
      return await file.text();
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = decoder.decode(bytes);
    let text = "";
    const matches = rawText.match(/\(([^)]+)\)/g);
    if (matches) {
      text = matches.map(m => m.slice(1, -1)).join(" ");
    }
    if (text.length < 50) {
      text = rawText.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").substring(0, 10000);
    }
    return text.substring(0, 15000) || "Unable to extract text from this PDF. Please try a text-based PDF.";
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setCompletedActions([]);
    setCurrentAction(null);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage.from("slides").upload(filePath, file);
      if (storageError) throw storageError;

      const text = await extractTextFromFile(file);
      setSlideText(text);

      const { data, error } = await supabase.from("uploads").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        status: "uploaded",
      }).select().single();

      if (error) throw error;
      setUploadId(data.id);
      toast.success("File uploaded! Now auto-generating all study materials...");
      setUploading(false);

      // Auto-generate all materials
      await autoGenerateAll(data.id, text);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploading(false);
    }
  };

  const autoGenerateAll = async (id: string, text: string) => {
    setGenerating(true);
    for (const a of ALL_ACTIONS) {
      setCurrentAction(a.action);
      try {
        await analyzeSlides(id, a.action, text);
        setCompletedActions(prev => [...prev, a.action]);
      } catch (err: any) {
        toast.error(`${a.label} failed: ${err.message}`);
      }
    }
    setCurrentAction(null);
    setGenerating(false);
    toast.success("All study materials generated! Check Summaries, Flashcards, and Quiz pages.");
  };

  const handleManualGenerate = async (action: string) => {
    if (!uploadId || !slideText) return;
    setManualGenerating(action);
    try {
      await analyzeSlides(uploadId, action, slideText);
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} regenerated!`);
      setCompletedActions(prev => prev.includes(action) ? prev : [...prev, action]);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setManualGenerating(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type === "application/pdf" || dropped.name.endsWith(".pdf"))) {
      setFile(dropped);
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const progress = ALL_ACTIONS.length > 0
    ? Math.round((completedActions.length / ALL_ACTIONS.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Upload Lecture Slides</h1>
        <p className="text-muted-foreground mt-1">Upload your PDF and we'll automatically generate all study materials — summaries, notes, flashcards, quiz questions, and a study guide</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <UploadIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium text-foreground mb-1">
              {file ? file.name : "Drop your PDF here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">PDF files up to 20MB</p>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <div className="flex gap-3 justify-center">
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
              {file && !generating && (
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : "Upload & Generate All"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-generation progress */}
      {(generating || completedActions.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                {generating ? "Generating Study Materials..." : "Study Materials Ready!"}
              </CardTitle>
              {generating && (
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{completedActions.length}/{ALL_ACTIONS.length} completed</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_ACTIONS.map((a) => {
                  const isComplete = completedActions.includes(a.action);
                  const isCurrent = currentAction === a.action;
                  const isManual = manualGenerating === a.action;

                  return (
                    <Button
                      key={a.action}
                      variant={isComplete ? "default" : "outline"}
                      className={`h-auto p-4 flex flex-col items-start gap-1 ${isComplete ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                      disabled={generating || isManual}
                      onClick={() => handleManualGenerate(a.action)}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent || isManual ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <a.icon className="w-4 h-4 text-primary" />
                        )}
                        <span className="font-medium">{a.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isCurrent ? "Generating..." : isComplete ? "Done — click to regenerate" : a.desc}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
