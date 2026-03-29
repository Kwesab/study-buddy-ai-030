import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Upload, Brain, CreditCard, ShieldCheck, Loader2, Search,
  TrendingUp, Crown, Trash2, Download, Activity, FileText, Award,
  MessageSquare, UserCog, BarChart3, AlertTriangle, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface UserData {
  user_id: string;
  display_name: string | null;
  study_streak: number;
  longest_streak: number;
  total_study_minutes: number;
  created_at: string;
}

interface SubData {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

interface UploadData {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  status: string;
  created_at: string;
}

interface RoleData {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
}

interface ActivityItem {
  type: "upload" | "quiz" | "signup" | "achievement";
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export default function AdminPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [subs, setSubs] = useState<SubData[]>([]);
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: "", id: "", name: "" });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; userId: string; userName: string; currentRole: string }>({ open: false, userId: "", userName: "", currentRole: "" });
  const [selectedRole, setSelectedRole] = useState("");
  const [planDialog, setPlanDialog] = useState<{ open: boolean; userId: string; userName: string; currentPlan: string }>({ open: false, userId: "", userName: "", currentPlan: "" });
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setRefreshing(true);
    const [usersRes, subsRes, uploadsRes, quizRes, flashcardRes, chatRes, rolesRes, uploadsListRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, study_streak, longest_streak, total_study_minutes, created_at").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, plan, status, current_period_end"),
      supabase.from("uploads").select("id", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
      supabase.from("flashcards").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("id, user_id, role"),
      supabase.from("uploads").select("id, user_id, file_name, file_type, file_size, status, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    setUsers(usersRes.data || []);
    setSubs(subsRes.data || []);
    setUploadCount(uploadsRes.count ?? 0);
    setQuizCount(quizRes.count ?? 0);
    setFlashcardCount(flashcardRes.count ?? 0);
    setChatCount(chatRes.count ?? 0);
    setRoles(rolesRes.data as RoleData[] || []);
    setUploads(uploadsListRes.data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const subMap = useMemo(() => new Map(subs.map(s => [s.user_id, s])), [subs]);
  const roleMap = useMemo(() => {
    const m = new Map<string, RoleData[]>();
    roles.forEach(r => {
      const existing = m.get(r.user_id) || [];
      existing.push(r);
      m.set(r.user_id, existing);
    });
    return m;
  }, [roles]);

  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach(u => m.set(u.user_id, u.display_name || "Unknown"));
    return m;
  }, [users]);

  // Activity feed
  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    uploads.slice(0, 20).forEach(u => {
      items.push({
        type: "upload",
        description: `Uploaded "${u.file_name}"`,
        timestamp: u.created_at,
        userId: u.user_id,
        userName: userNameMap.get(u.user_id) || "Unknown",
      });
    });
    users.slice(0, 10).forEach(u => {
      items.push({
        type: "signup",
        description: `New user joined`,
        timestamp: u.created_at,
        userId: u.user_id,
        userName: u.display_name || "Unknown",
      });
    });
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }, [uploads, users, userNameMap]);

  // Stats
  const paidUsers = subs.filter(s => s.plan !== "free").length;
  const totalRevenue = subs.reduce((acc, s) => {
    if (s.plan === "basic") return acc + 30;
    if (s.plan === "pro") return acc + 50;
    return acc;
  }, 0);
  const totalStudyMinutes = users.reduce((acc, u) => acc + u.total_study_minutes, 0);
  const avgStreak = users.length > 0 ? Math.round(users.reduce((acc, u) => acc + u.study_streak, 0) / users.length) : 0;

  // Signup trends (last 7 days)
  const signupTrends = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = users.filter(u => u.created_at.startsWith(dateStr)).length;
      days.push({ date: d.toLocaleDateString("en", { weekday: "short" }), count });
    }
    return days;
  }, [users]);

  // Handlers
  const handleDeleteUpload = async (uploadId: string) => {
    const { error } = await supabase.from("uploads").delete().eq("id", uploadId);
    if (error) { toast.error("Failed to delete upload"); return; }
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
    toast.success(`Role "${selectedRole}" assigned to ${roleDialog.userName}`);
    setRoleDialog({ open: false, userId: "", userName: "", currentRole: "" });
    loadData();
  };

  const handleRemoveRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast.error("Failed to remove role"); return; }
    toast.success("Role removed");
    loadData();
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !planDialog.userId) return;
    const { error } = await supabase.from("subscriptions").update({ plan: selectedPlan, updated_at: new Date().toISOString() }).eq("user_id", planDialog.userId);
    if (error) { toast.error("Failed to update plan"); return; }
    toast.success(`Plan updated to "${selectedPlan}" for ${planDialog.userName}`);
    setPlanDialog({ open: false, userId: "", userName: "", currentPlan: "" });
    loadData();
  };

  const exportCSV = (type: "users" | "subscriptions") => {
    let csv = "";
    if (type === "users") {
      csv = "Name,User ID,Streak,Longest Streak,Study Minutes,Joined,Plan\n";
      users.forEach(u => {
        const sub = subMap.get(u.user_id);
        csv += `"${u.display_name || ""}","${u.user_id}",${u.study_streak},${u.longest_streak},${u.total_study_minutes},"${new Date(u.created_at).toLocaleDateString()}","${sub?.plan || "free"}"\n`;
      });
    } else {
      csv = "User ID,Name,Plan,Status,Period End\n";
      subs.forEach(s => {
        const name = userNameMap.get(s.user_id) || "";
        csv += `"${s.user_id}","${name}","${s.plan}","${s.status}","${s.current_period_end || ""}"\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type} data exported`);
  };

  if (adminLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
    u.user_id.includes(search)
  );

  const filteredUploads = uploads.filter(u =>
    u.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const StatCard = ({ label, value, icon: Icon, color, subtitle }: { label: string; value: string | number; icon: any; color: string; subtitle?: string }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, content, and subscriptions</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={Users} color="text-primary" />
        <StatCard label="Paid Users" value={paidUsers} icon={Crown} color="text-warning" subtitle={`${users.length > 0 ? Math.round((paidUsers / users.length) * 100) : 0}% conversion`} />
        <StatCard label="Total Uploads" value={uploadCount} icon={Upload} color="text-accent" />
        <StatCard label="Monthly Revenue" value={`GHS ${totalRevenue}`} icon={TrendingUp} color="text-primary" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Quiz Attempts" value={quizCount} icon={Brain} color="text-accent" />
        <StatCard label="Flashcards" value={flashcardCount} icon={FileText} color="text-primary" />
        <StatCard label="Chat Messages" value={chatCount} icon={MessageSquare} color="text-muted-foreground" />
        <StatCard label="Avg Streak" value={`${avgStreak} days`} icon={Activity} color="text-warning" subtitle={`${totalStudyMinutes} total mins`} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-1 text-xs"><BarChart3 className="w-3 h-3" /> Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1 text-xs"><Users className="w-3 h-3" /> Users</TabsTrigger>
          <TabsTrigger value="content" className="gap-1 text-xs"><Upload className="w-3 h-3" /> Content</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1 text-xs"><CreditCard className="w-3 h-3" /> Subs</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1 text-xs"><UserCog className="w-3 h-3" /> Roles</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Signup Trends */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Signups (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {signupTrends.map((d, i) => {
                  const maxCount = Math.max(...signupTrends.map(x => x.count), 1);
                  const height = (d.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{d.count}</span>
                      <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(height, 4)}%` }}>
                        <div className="w-full h-full bg-primary rounded-t" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activityFeed.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No activity yet</p>
                ) : (
                  activityFeed.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.type === "upload" ? "bg-accent/10" :
                        item.type === "signup" ? "bg-primary/10" :
                        item.type === "achievement" ? "bg-warning/10" : "bg-muted"
                      }`}>
                        {item.type === "upload" && <Upload className="w-3.5 h-3.5 text-accent" />}
                        {item.type === "signup" && <Users className="w-3.5 h-3.5 text-primary" />}
                        {item.type === "achievement" && <Award className="w-3.5 h-3.5 text-warning" />}
                        {item.type === "quiz" && <Brain className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate"><span className="font-medium">{item.userName}</span> {item.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {["free", "basic", "pro"].map((plan) => {
                  const count = subs.filter(s => s.plan === plan).length;
                  const pct = subs.length > 0 ? Math.round((count / subs.length) * 100) : 0;
                  return (
                    <div key={plan} className="text-center">
                      <p className="text-xs text-muted-foreground capitalize">{plan}</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">{count}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCSV("users")}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} users found</p>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No users found</p>
            ) : (
              filteredUsers.map((u) => {
                const sub = subMap.get(u.user_id);
                const userRoles = roleMap.get(u.user_id) || [];
                return (
                  <Card key={u.user_id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm">{u.display_name || "No name"}</p>
                            {userRoles.map(r => (
                              <Badge key={r.id} variant="outline" className="text-[10px]">{r.role}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Streak: {u.study_streak}d • Best: {u.longest_streak}d • {u.total_study_minutes}min studied
                          </p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sub?.plan === "pro" ? "default" : sub?.plan === "basic" ? "secondary" : "outline"}>
                            {sub?.plan || "free"}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setPlanDialog({ open: true, userId: u.user_id, userName: u.display_name || "Unknown", currentPlan: sub?.plan || "free" });
                            setSelectedPlan(sub?.plan || "free");
                          }}>
                            <CreditCard className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setRoleDialog({ open: true, userId: u.user_id, userName: u.display_name || "Unknown", currentRole: "" });
                            setSelectedRole("");
                          }}>
                            <UserCog className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* CONTENT MODERATION TAB */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search uploads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <p className="text-xs text-muted-foreground">{filteredUploads.length} uploads shown (of {uploadCount} total)</p>

          <div className="space-y-2">
            {filteredUploads.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No uploads found</p>
            ) : (
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
                      <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.status === "processed" ? "default" : "secondary"}>{u.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDialog({ open: true, type: "upload", id: u.id, name: u.file_name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV("subscriptions")}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {["free", "basic", "pro"].map((plan) => {
              const count = subs.filter(s => s.plan === plan).length;
              return (
                <Card key={plan} className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground capitalize">{plan}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan === "basic" ? `GHS ${count * 30}/mo` : plan === "pro" ? `GHS ${count * 50}/mo` : "Free"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            {subs.filter(s => s.plan !== "free").length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No paid subscribers yet</p>
            ) : (
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
              })
            )}
          </div>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Assigned Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No roles assigned</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{userNameMap.get(r.user_id) || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{r.user_id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.role === "admin" ? "default" : "secondary"}>{r.role}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveRole(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quick Assign Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">Click the <UserCog className="w-3 h-3 inline" /> icon next to any user in the Users tab to assign a role.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: "", id: "", name: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteDialog.type === "upload") handleDeleteUpload(deleteDialog.id);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {roleDialog.userName}</DialogTitle>
            <DialogDescription>Select a role to assign to this user.</DialogDescription>
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
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, userId: "", userName: "", currentRole: "" })}>Cancel</Button>
            <Button onClick={handleAssignRole} disabled={!selectedRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Change Dialog */}
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
    </div>
  );
}
