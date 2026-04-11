import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, FileQuestion, BookOpen, CheckCircle2, AlertCircle, Trash2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/jpg", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "text/plain",
];

const ACCEPT_STRING = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.pptx,.ppt,.txt";

type PastQuestion = {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  answers: any;
  study_notes: any;
  created_at: string;
};

export default function PastQuestionsPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pastQuestions, setPastQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPQ, setSelectedPQ] = useState<PastQuestion | null>(null);

  const fetchPastQuestions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("past_questions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPastQuestions((data as PastQuestion[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPastQuestions(); }, [fetchPastQuestions]);

  const extractTextFromFile = async (f: File): Promise<string> => {
    if (f.type === "text/plain") {
      return await f.text();
    }
    if (f.type.startsWith("image/")) {
      // For images, we send a base64 to AI for OCR
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(`[IMAGE_BASE64:${(reader.result as string).split(",")[1]}]`);
        reader.readAsDataURL(f);
      });
    }
    // For PDF/DOCX/PPTX, use pdf.js-style text extraction on client
    // We'll read as array buffer and extract what we can
    const arrayBuffer = await f.arrayBuffer();
    
    if (f.type === "application/pdf") {
      // Dynamic import of pdfjs
      try {
        const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/+esm" as any);
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n\n";
        }
        return text || "[Could not extract text from PDF. The file may be scanned/image-based.]";
      } catch {
        return "[Could not extract text from PDF]";
      }
    }

    // For Word/PPT, try to extract text from the XML inside the zip
    try {
      const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm" as any)).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      let text = "";
      const files = Object.keys(zip.files);
      for (const fname of files) {
        if (fname.endsWith(".xml") && (fname.includes("document") || fname.includes("slide"))) {
          const xml = await zip.files[fname].async("string");
          const stripped = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (stripped.length > 20) text += stripped + "\n\n";
        }
      }
      return text || "[Could not extract readable text from this file]";
    } catch {
      return "[Could not extract text from this file format]";
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(10);

    try {
      // 1. Upload file to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("past-questions")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      setProgress(30);

      // 2. Create DB record
      const { data: record, error: dbError } = await supabase
        .from("past_questions")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();
      if (dbError) throw dbError;
      setProgress(50);

      // 3. Extract text client-side
      toast.info("Extracting text from your file...");
      const extractedText = await extractTextFromFile(file);
      setProgress(70);

      if (!extractedText || extractedText.length < 20) {
        toast.error("Could not extract enough text from this file. Try a different format.");
        await supabase.from("past_questions").update({ status: "failed" }).eq("id", record.id);
        setUploading(false);
        setProgress(0);
        fetchPastQuestions();
        return;
      }

      // 4. Send to edge function for AI analysis
      toast.info("AI is analyzing your past questions...");
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-past-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ pastQuestionId: record.id, extractedText }),
        }
      );
      setProgress(90);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      setProgress(100);
      toast.success("Past questions analyzed! Answers and notes are ready.");
      setFile(null);
      fetchPastQuestions();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("past_questions").delete().eq("id", id);
    toast.success("Deleted");
    if (selectedPQ?.id === id) setSelectedPQ(null);
    fetchPastQuestions();
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && ACCEPTED_TYPES.includes(dropped.type)) setFile(dropped);
    else toast.error("Unsupported file type");
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <FileQuestion className="w-7 h-7 text-primary" />
          Past Questions
        </h1>
        <p className="text-muted-foreground mt-1">Upload past exam papers and get AI-powered answers & study notes</p>
      </div>

      {/* Upload Section */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center py-10 rounded-lg transition-colors cursor-pointer ${
              dragOver ? "bg-primary/10" : "bg-muted/30"
            }`}
            onClick={() => !uploading && document.getElementById("pq-file-input")?.click()}
          >
            <Upload className="w-10 h-10 text-primary mb-3" />
            <p className="font-medium text-foreground">
              {file ? file.name : "Drop your past question paper here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, Images, Word, PowerPoint, TXT — Max 20MB
            </p>
            <input
              id="pq-file-input"
              type="file"
              accept={ACCEPT_STRING}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-foreground">{file.name}</span>
                <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(1)}MB</Badge>
              </div>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Analyzing..." : "Upload & Analyze"}
              </Button>
            </div>
          )}

          {progress > 0 && (
            <Progress value={progress} className="mt-3" />
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Past Papers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : pastQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No past papers uploaded yet</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-2">
                  {pastQuestions.map((pq) => (
                    <motion.div
                      key={pq.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPQ?.id === pq.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => pq.status === "completed" && setSelectedPQ(pq)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pq.file_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(pq.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={pq.status === "completed" ? "default" : pq.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                            {pq.status === "completed" ? "Ready" : pq.status === "processing" ? "Processing..." : pq.status === "failed" ? "Failed" : "Uploaded"}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDelete(pq.id); }}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Detail View */}
        <Card className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedPQ ? (
              <motion.div key={selectedPQ.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    {selectedPQ.file_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="answers">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="answers">Answers</TabsTrigger>
                      <TabsTrigger value="notes">Study Notes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="answers">
                      <ScrollArea className="h-[500px]">
                        {Array.isArray(selectedPQ.answers) && selectedPQ.answers.length > 0 ? (
                          <Accordion type="multiple" className="space-y-2">
                            {selectedPQ.answers.map((qa: any, i: number) => (
                              <AccordionItem key={i} value={`q-${i}`} className="border rounded-lg px-4">
                                <AccordionTrigger className="text-sm text-left">
                                  <div className="flex items-start gap-2">
                                    <Badge variant="outline" className="shrink-0">Q{qa.question_number || i + 1}</Badge>
                                    <span>{qa.question}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 pl-8">
                                    {qa.topic && <Badge className="mb-2">{qa.topic}</Badge>}
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                      <ReactMarkdown>{qa.answer}</ReactMarkdown>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p>No answers available</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="notes">
                      <ScrollArea className="h-[500px]">
                        {selectedPQ.study_notes && selectedPQ.study_notes.title ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-bold text-foreground">{selectedPQ.study_notes.title}</h3>
                            {selectedPQ.study_notes.sections?.map((section: any, i: number) => (
                              <Card key={i} className="p-4">
                                <h4 className="font-semibold text-primary mb-2">{section.topic}</h4>
                                <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                                  <ReactMarkdown>{section.explanation}</ReactMarkdown>
                                </div>
                                {section.key_points?.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Points</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {section.key_points.map((p: string, j: number) => <li key={j}>{p}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {section.tips && (
                                  <div className="bg-primary/5 rounded-lg p-3 mt-2">
                                    <p className="text-xs font-semibold text-primary mb-1">💡 Exam Tip</p>
                                    <p className="text-sm">{section.tips}</p>
                                  </div>
                                )}
                              </Card>
                            ))}
                            {selectedPQ.study_notes.summary && (
                              <Card className="p-4 bg-muted/50">
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Summary</p>
                                <p className="text-sm">{selectedPQ.study_notes.summary}</p>
                              </Card>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="w-8 h-8 mx-auto mb-2" />
                            <p>No study notes available</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileQuestion className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Select a past paper to view answers & notes</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
