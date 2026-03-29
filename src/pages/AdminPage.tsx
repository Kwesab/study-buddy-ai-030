import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Upload, Brain, CreditCard, ShieldCheck, Loader2, Search,
  TrendingUp, Crown, Trash2, Download, Activity, FileText, Award,
  MessageSquare, UserCog, BarChart3, AlertTriangle, RefreshCw,
  Megaphone, History, Eye, Ban, CheckCircle2, Send,
  ChevronDown, ChevronUp, Server, Database, Zap, Clock,
  Globe, GraduationCap, BookOpen, Target, Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, Area, AreaChart,
} from "recharts";

// Types
interface UserData {
  user_id: string;
  display_name: string | null;
  study_streak: number;
  longest_streak: number;
  total_study_minutes: number;
  created_at: string;
  avatar_url: string | null;
}
interface SubData { user_id: string; plan: string; status: string; current_period_end: string | null; }
interface UploadData { id: string; user_id: string; file_name: string; file_type: string; file_size: number | null; status: string; created_at: string; }
interface RoleData { id: string; user_id: string; role: "admin" | "moderator" | "user"; }
interface Announcement { id: string; admin_id: string; title: string; message: string; type: string; is_active: boolean; created_at: string; expires_at: string | null; }
interface AuditLog { id: string; admin_id: string; action: string; target_type: string | null; target_id: string | null; details: any; created_at: string; }

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning, 45 93% 47%))"];

export default function AdminPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [subs, setSubs] = useState<SubData[]>([]);
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [quizAttemptCount, setQuizAttemptCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: "", id: "", name: "" });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [selectedRole, setSelectedRole] = useState("");
  const [planDialog, setPlanDialog] = useState<{ open: boolean; userId: string; userName: string; currentPlan: string }>({ open: false, userId: "", userName: "", currentPlan: "" });
  const [selectedPlan, setSelectedPlan] = useState("");
  const [userDetailDialog, setUserDetailDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null });
  const [userDetailData, setUserDetailData] = useState<{ uploads: number; quizzes: number; flashcards: number; chats: number } | null>(null);

  // Announcement form
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "", type: "info" });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ health: true, trends: true, distribution: true, activity: true });

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const logAction = useCallback(async (action: string, target_type?: string, target_id?: string, details?: any) => {
    if (!adminUser) return;
    await supabase.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      action,
      target_type: target_type || null,
      target_id: target_id || null,
      details: details || {},
    });
  }, [adminUser]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setRefreshing(true);
    const [usersRes, subsRes, uploadsCountRes, quizRes, flashcardRes, chatRes, rolesRes, uploadsListRes, announcementsRes, auditRes, quizAttemptRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, study_streak, longest_streak, total_study_minutes, created_at, avatar_url").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, plan, status, current_period_end"),
      supabase.from("uploads").select("id", { count: "exact", head: true }),
      supabase.from("quiz_questions").select("id", { count: "exact", head: true }),
      supabase.from("flashcards").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("id, user_id, role"),
      supabase.from("uploads").select("id, user_id, file_name, file_type, file_size, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("platform_announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    ]);
    setUsers(usersRes.data || []);
    setSubs(subsRes.data || []);
    setUploadCount(uploadsCountRes.count ?? 0);
    setQuizCount(quizRes.count ?? 0);
    setFlashcardCount(flashcardRes.count ?? 0);
    setChatCount(chatRes.count ?? 0);
    setQuizAttemptCount(quizAttemptRes.count ?? 0);
    setRoles(rolesRes.data as RoleData[] || []);
    setUploads(uploadsListRes.data || []);
    setAnnouncements(announcementsRes.data as Announcement[] || []);
    setAuditLogs(auditRes.data as AuditLog[] || []);
    setLoading(false);
    setRefreshing(false);
  };

  const subMap = useMemo(() => new Map(subs.map(s => [s.user_id, s])), [subs]);
  const roleMap = useMemo(() => {
    const m = new Map<string, RoleData[]>();
    roles.forEach(r => { const e = m.get(r.user_id) || []; e.push(r); m.set(r.user_id, e); });
    return m;
  }, [roles]);
  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach(u => m.set(u.user_id, u.display_name || "Unknown"));
    return m;
  }, [users]);

  // Computed analytics
  const paidUsers = subs.filter(s => s.plan !== "free").length;
  const totalRevenue = subs.reduce((acc, s) => acc + (s.plan === "basic" ? 30 : s.plan === "pro" ? 50 : 0), 0);
  const totalStudyMinutes = users.reduce((acc, u) => acc + u.total_study_minutes, 0);
  const avgStreak = users.length > 0 ? Math.round(users.reduce((acc, u) => acc + u.study_streak, 0) / users.length) : 0;
  const activeUsers = users.filter(u => u.study_streak > 0).length;
  const engagementRate = users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0;
  const totalStorageMB = uploads.reduce((acc, u) => acc + (u.file_size || 0), 0) / (1024 * 1024);
  const avgStudyMin = users.length > 0 ? Math.round(totalStudyMinutes / users.length) : 0;

  // Signup trends (last 14 days)
  const signupTrends = useMemo(() => {
    const days: { date: string; signups: number; uploads: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        signups: users.filter(u => u.created_at.startsWith(dateStr)).length,
        uploads: uploads.filter(u => u.created_at.startsWith(dateStr)).length,
      });
    }
    return days;
  }, [users, uploads]);

  // Plan distribution pie
  const planDistribution = useMemo(() => {
    const counts = { free: 0, basic: 0, pro: 0 };
    subs.forEach(s => { if (s.plan in counts) counts[s.plan as keyof typeof counts]++; });
    return [
      { name: "Free", value: counts.free },
      { name: "Basic", value: counts.basic },
      { name: "Pro", value: counts.pro },
    ];
  }, [subs]);

  // Top users by study time
  const topStudiers = useMemo(() =>
    [...users].sort((a, b) => b.total_study_minutes - a.total_study_minutes).slice(0, 5),
    [users]
  );

  // Activity feed
  const activityFeed = useMemo(() => {
    const items: { type: string; description: string; timestamp: string; userName: string }[] = [];
    uploads.slice(0, 15).forEach(u => items.push({ type: "upload", description: `Uploaded "${u.file_name}"`, timestamp: u.created_at, userName: userNameMap.get(u.user_id) || "Unknown" }));
    users.slice(0, 10).forEach(u => items.push({ type: "signup", description: "New user joined", timestamp: u.created_at, userName: u.display_name || "Unknown" }));
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }, [uploads, users, userNameMap]);

  // Handlers
  const handleDeleteUpload = async (uploadId: string) => {
    const { error } = await supabase.from("uploads").delete().eq("id", uploadId);
    if (error) { toast.error("Failed to delete upload"); return; }
    await logAction("delete_upload", "upload", uploadId);
    toast.success("Upload deleted");
    setUploads(prev => prev.filter(u => u.id !== uploadId));
    setUploadCount(prev => prev - 1);
    setDeleteDialog({ open: false, type: "", id: "", name: "" });
  };

  const handleAssignRole = async () => {
    if (!selectedRole || !roleDialog.userId) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: roleDialog.userId,
      role: selectedRole as "admin" | "moderator" | "user",
    });
    if (error) {
      if (error.code === "23505") toast.error("User already has this role");
      else toast.error("Failed to assign role");
      return;
    }
    await logAction("assign_role", "user", roleDialog.userId, { role: selectedRole, userName: roleDialog.userName });
    toast.success(`Role "${selectedRole}" assigned to ${roleDialog.userName}`);
    setRoleDialog({ open: false, userId: "", userName: "" });
    loadData();
  };

  const handleRemoveRole = async (roleId: string, userId: string, roleName: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast.error("Failed to remove role"); return; }
    await logAction("remove_role", "user", userId, { role: roleName });
    toast.success("Role removed");
    loadData();
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !planDialog.userId) return;
    const { error } = await supabase.from("subscriptions").update({ plan: selectedPlan, updated_at: new Date().toISOString() }).eq("user_id", planDialog.userId);
    if (error) { toast.error("Failed to update plan"); return; }
    await logAction("change_plan", "subscription", planDialog.userId, { from: planDialog.currentPlan, to: selectedPlan, userName: planDialog.userName });
    toast.success(`Plan updated to "${selectedPlan}" for ${planDialog.userName}`);
    setPlanDialog({ open: false, userId: "", userName: "", currentPlan: "" });
    loadData();
  };

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim() || !adminUser) return;
    setSendingAnnouncement(true);
    const { error } = await supabase.from("platform_announcements").insert({
      admin_id: adminUser.id,
      title: announcementForm.title,
      message: announcementForm.message,
      type: announcementForm.type,
    });
    if (error) { toast.error("Failed to send announcement"); setSendingAnnouncement(false); return; }
    await logAction("send_announcement", "announcement", undefined, { title: announcementForm.title });
    toast.success("Announcement published!");
    setAnnouncementForm({ title: "", message: "", type: "info" });
    setSendingAnnouncement(false);
    loadData();
  };

  const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("platform_announcements").update({ is_active: !isActive }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    await logAction(isActive ? "deactivate_announcement" : "activate_announcement", "announcement", id);
    toast.success(isActive ? "Announcement hidden" : "Announcement activated");
    loadData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("platform_announcements").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    await logAction("delete_announcement", "announcement", id);
    toast.success("Announcement deleted");
    loadData();
  };

  const loadUserDetail = async (user: UserData) => {
    setUserDetailDialog({ open: true, user });
    setUserDetailData(null);
    const [u, q, f, c] = await Promise.all([
      supabase.from("uploads").select("id", { count: "exact", head: true }).eq("user_id", user.user_id),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.user_id),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.user_id),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", user.user_id),
    ]);
    setUserDetailData({ uploads: u.count ?? 0, quizzes: q.count ?? 0, flashcards: f.count ?? 0, chats: c.count ?? 0 });
  };

  const exportCSV = (type: "users" | "subscriptions" | "audit") => {
    let csv = "";
    if (type === "users") {
      csv = "Name,User ID,Streak,Longest Streak,Study Minutes,Joined,Plan\n";
      users.forEach(u => {
        const sub = subMap.get(u.user_id);
        csv += `"${u.display_name || ""}","${u.user_id}",${u.study_streak},${u.longest_streak},${u.total_study_minutes},"${new Date(u.created_at).toLocaleDateString()}","${sub?.plan || "free"}"\n`;
      });
    } else if (type === "subscriptions") {
      csv = "User ID,Name,Plan,Status,Period End\n";
      subs.forEach(s => {
        csv += `"${s.user_id}","${userNameMap.get(s.user_id) || ""}","${s.plan}","${s.status}","${s.current_period_end || ""}"\n`;
      });
    } else {
      csv = "Time,Action,Target Type,Target ID,Details\n";
      auditLogs.forEach(l => {
        csv += `"${new Date(l.created_at).toLocaleString()}","${l.action}","${l.target_type || ""}","${l.target_id || ""}","${JSON.stringify(l.details)}"\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${type} data exported`);
  };

  if (adminLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)
  );
  const filteredUploads = uploads.filter(u => u.file_name.toLowerCase().includes(search.toLowerCase()));

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }: { label: string; value: string | number; icon: any; color: string; subtitle?: string; trend?: string }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.replace("text-", "bg-")}/10`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            {trend && <span className="text-xs text-emerald-500 font-medium">{trend}</span>}
          </div>
          <p className="text-2xl font-display font-bold text-foreground mt-2">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );

  const SectionHeader = ({ title, icon: Icon, sectionKey, actions }: { title: string; icon: any; sectionKey: string; actions?: React.ReactNode }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {expandedSections[sectionKey] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Admin Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Full platform control • University student management</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Globe className="w-3 h-3" /> Live
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Students" value={users.length} icon={GraduationCap} color="text-primary" trend={users.length > 0 ? "Active" : undefined} />
        <StatCard label="Paid Students" value={paidUsers} icon={Crown} color="text-amber-500" subtitle={`${users.length > 0 ? Math.round((paidUsers / users.length) * 100) : 0}% conversion`} />
        <StatCard label="Monthly Revenue" value={`GHS ${totalRevenue}`} icon={TrendingUp} color="text-emerald-500" />
        <StatCard label="Engagement Rate" value={`${engagementRate}%`} icon={Target} color="text-violet-500" subtitle={`${activeUsers} active users`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Uploads" value={uploadCount} icon={Upload} color="text-blue-500" />
        <StatCard label="Quiz Attempts" value={quizAttemptCount} icon={Brain} color="text-pink-500" subtitle={`${quizCount} questions`} />
        <StatCard label="Flashcards" value={flashcardCount} icon={BookOpen} color="text-orange-500" />
        <StatCard label="Chat Messages" value={chatCount} icon={MessageSquare} color="text-cyan-500" subtitle={`${avgStudyMin} avg study min`} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full">
          <TabsTrigger value="overview" className="gap-1 text-xs"><BarChart3 className="w-3 h-3 hidden sm:block" /> Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1 text-xs"><Users className="w-3 h-3 hidden sm:block" /> Students</TabsTrigger>
          <TabsTrigger value="content" className="gap-1 text-xs"><Upload className="w-3 h-3 hidden sm:block" /> Content</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1 text-xs"><CreditCard className="w-3 h-3 hidden sm:block" /> Revenue</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1 text-xs"><Megaphone className="w-3 h-3 hidden sm:block" /> Announce</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1 text-xs"><UserCog className="w-3 h-3 hidden sm:block" /> Roles</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 text-xs"><History className="w-3 h-3 hidden sm:block" /> Audit</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Platform Health */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <SectionHeader title="Platform Health" icon={Server} sectionKey="health" />
            </CardHeader>
            <AnimatePresence>
              {expandedSections.health && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                        <p className="text-xs font-medium text-foreground mt-1">Database</p>
                        <p className="text-[10px] text-emerald-500">Operational</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                        <p className="text-xs font-medium text-foreground mt-1">Auth</p>
                        <p className="text-[10px] text-emerald-500">Operational</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <Database className="w-5 h-5 text-primary mx-auto" />
                        <p className="text-xs font-medium text-foreground mt-1">Storage</p>
                        <p className="text-[10px] text-muted-foreground">{totalStorageMB.toFixed(1)} MB used</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <Zap className="w-5 h-5 text-amber-500 mx-auto" />
                        <p className="text-xs font-medium text-foreground mt-1">AI Functions</p>
                        <p className="text-[10px] text-emerald-500">Operational</p>
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Growth Trends Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <SectionHeader title="Growth Trends (14 Days)" icon={TrendingUp} sectionKey="trends" />
            </CardHeader>
            <AnimatePresence>
              {expandedSections.trends && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={signupTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="signups" name="Signups" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                          <Area type="monotone" dataKey="uploads" name="Uploads" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plan Distribution Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <SectionHeader title="Plan Distribution" icon={CreditCard} sectionKey="distribution" />
              </CardHeader>
              <AnimatePresence>
                {expandedSections.distribution && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {planDistribution.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Top Studiers */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Top Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topStudiers.map((u, i) => (
                    <div key={u.user_id} className="flex items-center gap-3 py-1.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-500/10 text-amber-500" : i === 1 ? "bg-gray-400/10 text-gray-400" : i === 2 ? "bg-orange-600/10 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.total_study_minutes} min • {u.study_streak}d streak</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{subMap.get(u.user_id)?.plan || "free"}</Badge>
                    </div>
                  ))}
                  {topStudiers.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No data yet</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <SectionHeader title="Live Activity Feed" icon={Activity} sectionKey="activity" />
            </CardHeader>
            <AnimatePresence>
              {expandedSections.activity && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <CardContent>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {activityFeed.length === 0 ? <p className="text-center text-muted-foreground py-6">No activity yet</p> :
                        activityFeed.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.type === "upload" ? "bg-blue-500/10" : "bg-primary/10"}`}>
                              {item.type === "upload" ? <Upload className="w-3 h-3 text-blue-500" /> : <Users className="w-3 h-3 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate"><span className="font-medium">{item.userName}</span> {item.description}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </TabsContent>

        {/* ===== STUDENTS TAB ===== */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCSV("users")}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{filteredUsers.length} students found</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">Free: {subs.filter(s => s.plan === "free").length}</Badge>
              <Badge variant="outline" className="text-[10px]">Basic: {subs.filter(s => s.plan === "basic").length}</Badge>
              <Badge variant="outline" className="text-[10px]">Pro: {subs.filter(s => s.plan === "pro").length}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
              filteredUsers.length === 0 ? <p className="text-center text-muted-foreground py-10">No students found</p> :
                filteredUsers.map((u) => {
                  const sub = subMap.get(u.user_id);
                  const userRoles = roleMap.get(u.user_id) || [];
                  return (
                    <Card key={u.user_id} className="border-border/50 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => loadUserDetail(u)}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{(u.display_name || "?")[0].toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-foreground text-sm">{u.display_name || "No name"}</p>
                                  {userRoles.map(r => <Badge key={r.id} variant="outline" className="text-[10px] h-4">{r.role}</Badge>)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  🔥 {u.study_streak}d streak • ⏱️ {u.total_study_minutes}min • Joined {new Date(u.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={sub?.plan === "pro" ? "default" : sub?.plan === "basic" ? "secondary" : "outline"} className="text-[10px]">
                              {sub?.plan || "free"}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View details" onClick={() => loadUserDetail(u)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Change plan" onClick={() => {
                              setPlanDialog({ open: true, userId: u.user_id, userName: u.display_name || "Unknown", currentPlan: sub?.plan || "free" });
                              setSelectedPlan(sub?.plan || "free");
                            }}>
                              <CreditCard className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Assign role" onClick={() => {
                              setRoleDialog({ open: true, userId: u.user_id, userName: u.display_name || "Unknown" });
                              setSelectedRole("");
                            }}>
                              <UserCog className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </TabsContent>

        {/* ===== CONTENT TAB ===== */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search uploads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <p className="text-xs text-muted-foreground">{filteredUploads.length} uploads shown (of {uploadCount} total)</p>

          <div className="space-y-2">
            {filteredUploads.length === 0 ? <p className="text-center text-muted-foreground py-10">No uploads found</p> :
              filteredUploads.map((u) => (
                <Card key={u.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="font-medium text-foreground text-sm truncate">{u.file_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By: {userNameMap.get(u.user_id) || "Unknown"} • {u.file_type} • {u.file_size ? `${(u.file_size / 1024).toFixed(0)}KB` : "N/A"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.status === "processed" ? "default" : "secondary"} className="text-[10px]">{u.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDialog({ open: true, type: "upload", id: u.id, name: u.file_name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ===== REVENUE TAB ===== */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-display font-bold text-foreground">GHS {totalRevenue}/mo</h3>
              <p className="text-xs text-muted-foreground">{paidUsers} paying students</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCSV("subscriptions")}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["free", "basic", "pro"].map((plan) => {
              const count = subs.filter(s => s.plan === plan).length;
              const rev = plan === "basic" ? count * 30 : plan === "pro" ? count * 50 : 0;
              return (
                <Card key={plan} className={`border-border/50 ${plan === "pro" ? "border-primary/30" : ""}`}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground capitalize font-medium">{plan}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">{count}</p>
                    <p className="text-xs text-muted-foreground">{rev > 0 ? `GHS ${rev}/mo` : "Free"}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Paying Students</h4>
            {subs.filter(s => s.plan !== "free").length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No paid subscribers yet</p> :
              subs.filter(s => s.plan !== "free").map((s) => {
                const u = users.find(u => u.user_id === s.user_id);
                return (
                  <Card key={s.user_id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{u?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.current_period_end ? `Renews ${new Date(s.current_period_end).toLocaleDateString()}` : "Active"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.plan === "pro" ? "default" : "secondary"}>{s.plan}</Badge>
                        <Badge variant={s.status === "active" ? "default" : "destructive"} className="text-xs">{s.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setPlanDialog({ open: true, userId: s.user_id, userName: u?.display_name || "Unknown", currentPlan: s.plan });
                          setSelectedPlan(s.plan);
                        }}>
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* ===== ANNOUNCEMENTS TAB ===== */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Broadcast to All Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Announcement title..." value={announcementForm.title} onChange={e => setAnnouncementForm(p => ({ ...p, title: e.target.value }))} />
              <Textarea placeholder="Write your announcement message..." value={announcementForm.message} onChange={e => setAnnouncementForm(p => ({ ...p, message: e.target.value }))} rows={3} />
              <div className="flex items-center gap-3">
                <Select value={announcementForm.type} onValueChange={v => setAnnouncementForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                    <SelectItem value="urgent">🚨 Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement || !announcementForm.title.trim() || !announcementForm.message.trim()} className="gap-1">
                  {sendingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>

          <h4 className="text-sm font-medium text-foreground">Published Announcements</h4>
          <div className="space-y-2">
            {announcements.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No announcements yet</p> :
              announcements.map((a) => (
                <Card key={a.id} className={`border-border/50 ${!a.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={a.type === "urgent" ? "destructive" : a.type === "warning" ? "secondary" : "outline"} className="text-[10px]">{a.type}</Badge>
                          <h5 className="font-medium text-foreground text-sm">{a.title}</h5>
                          {!a.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Hidden</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={a.is_active ? "Hide" : "Show"} onClick={() => handleToggleAnnouncement(a.id, a.is_active)}>
                          {a.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAnnouncement(a.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ===== ROLES TAB ===== */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Assigned Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? <p className="text-center text-muted-foreground py-6">No roles assigned</p> :
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{userNameMap.get(r.user_id) || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{r.user_id.slice(0, 12)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.role === "admin" ? "default" : "secondary"}>{r.role}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveRole(r.id, r.user_id, r.role)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">💡 Use the <UserCog className="w-3 h-3 inline" /> button in the Students tab to assign roles to users.</p>
        </TabsContent>

        {/* ===== AUDIT LOG TAB ===== */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Admin Activity Log
            </h4>
            <Button variant="outline" size="sm" onClick={() => exportCSV("audit")}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <div className="space-y-1.5">
            {auditLogs.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">No admin actions recorded yet</p> :
              auditLogs.map((log) => (
                <Card key={log.id} className="border-border/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                        {log.target_type && <span className="text-muted-foreground"> • {log.target_type}</span>}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">{JSON.stringify(log.details)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}
      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{deleteDialog.name}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: "", id: "", name: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteDialog.type === "upload") handleDeleteUpload(deleteDialog.id); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {roleDialog.userName}</DialogTitle>
            <DialogDescription>Select a role to assign.</DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, userId: "", userName: "" })}>Cancel</Button>
            <Button onClick={handleAssignRole} disabled={!selectedRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Change */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan for {planDialog.userName}</DialogTitle>
            <DialogDescription>Current plan: <Badge variant="outline">{planDialog.currentPlan}</Badge></DialogDescription>
          </DialogHeader>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic (GHS 30/mo)</SelectItem>
              <SelectItem value="pro">Pro (GHS 50/mo)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, userId: "", userName: "", currentPlan: "" })}>Cancel</Button>
            <Button onClick={handleChangePlan} disabled={!selectedPlan || selectedPlan === planDialog.currentPlan}>Update Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog open={userDetailDialog.open} onOpenChange={(open) => setUserDetailDialog({ open, user: open ? userDetailDialog.user : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Student Profile
            </DialogTitle>
          </DialogHeader>
          {userDetailDialog.user && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{(userDetailDialog.user.display_name || "?")[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{userDetailDialog.user.display_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(userDetailDialog.user.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">{userDetailDialog.user.study_streak}</p>
                  <p className="text-[10px] text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">{userDetailDialog.user.longest_streak}</p>
                  <p className="text-[10px] text-muted-foreground">Best Streak</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">{userDetailDialog.user.total_study_minutes}</p>
                  <p className="text-[10px] text-muted-foreground">Study Minutes</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">{subMap.get(userDetailDialog.user.user_id)?.plan || "free"}</p>
                  <p className="text-[10px] text-muted-foreground">Plan</p>
                </div>
              </div>

              {userDetailData ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Activity Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Uploads", value: userDetailData.uploads, icon: Upload },
                      { label: "Quiz Attempts", value: userDetailData.quizzes, icon: Brain },
                      { label: "Flashcards", value: userDetailData.flashcards, icon: BookOpen },
                      { label: "Chat Messages", value: userDetailData.chats, icon: MessageSquare },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
