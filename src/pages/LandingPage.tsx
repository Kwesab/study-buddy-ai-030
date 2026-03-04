import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, Upload, BookOpen, HelpCircle, CreditCard,
  MessageSquare, TrendingUp, CalendarDays, Sparkles, ArrowRight, Zap, Brain, Target,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Upload, title: "Upload Slides", desc: "Drop your lecture PDFs and let AI extract all the knowledge automatically." },
  { icon: BookOpen, title: "Smart Summaries", desc: "Get instant, structured summaries with key points and terminology." },
  { icon: CreditCard, title: "Flashcards", desc: "Auto-generated flashcards with mastery tracking and spaced review." },
  { icon: HelpCircle, title: "Quizzes", desc: "Test yourself with MCQ, true/false, and short answer questions." },
  { icon: MessageSquare, title: "AI Tutor", desc: "Chat with an AI that knows your slides and explains concepts simply." },
  { icon: TrendingUp, title: "Performance Tracking", desc: "See your progress, weak topics, and improvement over time." },
];

const stats = [
  { icon: Zap, value: "Instant", label: "Content generation" },
  { icon: Brain, value: "AI-Powered", label: "Study materials" },
  { icon: Target, value: "Tracked", label: "Quiz improvement" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AI Student Companion</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1.5">Get Started <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full gradient-primary opacity-[0.07] blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full gradient-accent opacity-[0.07] blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge label="AI-Powered Study Platform" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-6 leading-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Turn Your Lecture Slides Into{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                Study Superpowers
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Upload your PDFs. Get summaries, flashcards, quizzes, and an AI tutor that knows your material — all in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
              <Link to="/auth">
                <Button size="lg" className="gap-2 text-base px-8 h-12">
                  <Sparkles className="w-4 h-4" /> Start Studying Free
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">See Features</Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mt-16"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Everything You Need to Ace Your Exams
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              One upload, six powerful study tools — powered by AI that actually understands your content.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Card className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all h-full">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              How It Works
            </h2>
            <p className="text-muted-foreground mt-3">Three steps to smarter studying</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload", desc: "Drop your lecture PDF or presentation slides." },
              { step: "2", title: "Generate", desc: "AI creates summaries, flashcards, and quiz questions." },
              { step: "3", title: "Study & Track", desc: "Review, quiz yourself, and track improvement over time." },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="text-center">
                <div className="w-12 h-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold shadow-glow">{s.step}</div>
                <h3 className="font-bold text-foreground mt-4 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <Card className="border-border/50 overflow-hidden relative">
              <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
              <CardContent className="p-10 sm:p-14 relative">
                <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Ready to Study Smarter?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Join students who are using AI to transform their study sessions and ace their exams.
                </p>
                <Link to="/auth">
                  <Button size="lg" className="gap-2 text-base px-8 h-12">
                    <Sparkles className="w-4 h-4" /> Get Started — It's Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>AI Student Companion</span>
          </div>
          <p>© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      <Sparkles className="w-3 h-3" /> {label}
    </span>
  );
}
