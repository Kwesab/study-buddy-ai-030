import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Upload, BookOpen, HelpCircle, CreditCard,
  MessageSquare, TrendingUp, Sparkles, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: "Instant", label: "Content generation" },
  { value: "AI-Powered", label: "Study materials" },
  { value: "Tracked", label: "Quiz improvement" },
];

const steps = [
  { n: "01", title: "Upload Materials", desc: "Import your lecture slides, notes, or past papers in any common document format." },
  { n: "02", title: "AI Analysis", desc: "Our AI processes your content, identifying key concepts, themes, and likely exam questions." },
  { n: "03", title: "Master Subjects", desc: "Interact with your AI tutor and use generated flashcards to lock in your understanding." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary-glow selection:text-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">AI Student Companion</span>
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
      <section className="relative pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-secondary/40 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-xs font-medium text-accent tracking-wider uppercase">AI-Powered Study Platform</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-[1.1] max-w-4xl">
            Turn your lecture slides into{" "}
            <span className="text-gradient">study superpowers</span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground mb-10">
            Upload your PDFs. Get summaries, flashcards, quizzes, and an AI tutor that knows your material — all in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link to="/auth">
              <Button size="lg" className="gap-2 h-13 px-8 py-4 text-base font-bold rounded-xl shadow-glow hover:shadow-[0_0_32px_hsl(var(--primary-glow)/0.45)] active:scale-95 transition-all">
                <Sparkles className="w-4 h-4" /> Start Studying Free
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="px-8 py-4 text-base font-bold rounded-xl">See Features</Button>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl border-t border-border pt-12">
            {stats.map((s, i) => (
              <div key={i} className={`flex flex-col items-center ${i === 1 ? "sm:border-x border-border" : ""}`}>
                <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">{s.value}</span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Bento feature grid */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Everything you need to excel</h2>
          <p className="text-muted-foreground">Six powerful study tools — powered by AI that actually understands your content.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 md:auto-rows-[200px] gap-4">
          {/* AI Tutor — large */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="md:col-span-8 md:row-span-2 bento-tile group p-8 bg-gradient-to-br from-secondary/60 to-background">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">24/7 Personal AI Tutor</h3>
                <p className="text-muted-foreground max-w-md">
                  Chat with an AI that knows your slides — instant answers, personalized explanations, and step-by-step guidance on any topic.
                </p>
              </div>
              <div className="mt-6 h-10 w-full max-w-[200px] rounded-lg border border-border bg-background/60" />
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl group-hover:bg-accent/20 transition-all duration-500" />
          </motion.div>

          {/* Flashcards — tall */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
            className="md:col-span-4 md:row-span-2 bento-tile p-8">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">AI Flashcards</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Notes turned into spaced-repetition flashcards with mastery tracking, automatically.
            </p>
            <div className="flex flex-col gap-2">
              <div className="h-4 w-3/4 rounded bg-primary/20" />
              <div className="h-4 w-1/2 rounded bg-primary/10" />
            </div>
          </motion.div>

          {[
            { icon: Upload, title: "Upload Slides", desc: "Drop PDFs, PPTX, or Word files directly into your study space." },
            { icon: HelpCircle, title: "Smart Quizzes", desc: "Test yourself with AI-generated MCQ, true/false, and short answers." },
            { icon: BookOpen, title: "Smart Summaries", desc: "Turn lengthy lectures into concise, actionable study guides." },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 * i }}
              className="md:col-span-4 md:row-span-1 bento-tile p-6 hover:bg-secondary/40">
              <f.icon className="w-5 h-5 text-accent mb-3" />
              <h3 className="font-display text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}

          {/* Performance — wide */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="md:col-span-12 md:row-span-1 bento-tile p-8 flex items-center justify-between bg-gradient-to-r from-secondary/50 to-background">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h3 className="font-display text-xl font-bold">Performance Tracking</h3>
              </div>
              <p className="text-sm text-muted-foreground">Visualize your progress and identify knowledge gaps automatically.</p>
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="w-12 h-6 rounded-full bg-accent/40" />
              <div className="w-24 h-6 rounded-full bg-primary/20" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground">Three simple steps to academic excellence.</p>
            </div>
            <div className="hidden md:block h-px flex-grow bg-border mx-12 mb-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((s) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative pt-6">
                <div className="font-display text-7xl font-bold text-primary/20 absolute -top-4 -left-2 pointer-events-none select-none">{s.n}</div>
                <div className="relative z-10">
                  <h3 className="font-display text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bento-tile p-10 sm:p-16 text-center bg-gradient-to-br from-secondary/60 to-background">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <GraduationCap className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="font-display text-2xl sm:text-4xl font-bold mb-3">Ready to study smarter?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join students using AI to transform their study sessions and ace their exams.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-8 py-4 text-base font-bold rounded-xl shadow-glow">
                <Sparkles className="w-4 h-4" /> Get Started — It's Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" />
            <span>AI Student Companion</span>
          </div>
          <p>© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
