import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Users, Upload, Brain, CreditCard, ShieldCheck, Loader2, Search,
  TrendingUp, Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface UserData {
  user_id: string;
  display_name: string | null;
  study_streak: number;
  created_at: string;
}

interface SubData {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export default function AdminPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [subs, setSubs] = useState<SubData[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    const [usersRes, subsRes, uploadsRes, quizRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, study_streak, created_at").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, plan, status, current_period_end"),
      supabase.from("uploads").select("id", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    ]);
    setUsers(usersRes.data || []);
    setSubs(subsRes.data || []);
    setUploadCount(uploadsRes.count ?? 0);
    setQuizCount(quizRes.count ?? 0);
    setLoading(false);
  };

  if (adminLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers = users.filter(u => 
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || 
    u.user_id.includes(search)
  );

  const subMap = new Map(subs.map(s => [s.user_id, s]));
  const paidUsers = subs.filter(s => s.plan !== "free").length;
  const totalRevenue = subs.reduce((acc, s) => {
    if (s.plan === "basic") return acc + 30;
    if (s.plan === "pro") return acc + 50;
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage users, content, and subscriptions</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
          { label: "Paid Users", value: paidUsers, icon: Crown, color: "text-warning" },
          { label: "Total Uploads", value: uploadCount, icon: Upload, color: "text-accent" },
          { label: "Monthly Revenue", value: `GHS ${totalRevenue}`, icon: TrendingUp, color: "text-success" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="users" className="gap-1"><Users className="w-4 h-4" /> Users</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1"><CreditCard className="w-4 h-4" /> Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No users found</p>
            ) : (
              filteredUsers.map((u) => {
                const sub = subMap.get(u.user_id);
                return (
                  <Card key={u.user_id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{u.display_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground">Streak: {u.study_streak} days • Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sub?.plan === "pro" ? "default" : sub?.plan === "basic" ? "secondary" : "outline"}>
                          {sub?.plan || "free"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            {["free", "basic", "pro"].map((plan) => {
              const count = subs.filter(s => s.plan === plan).length;
              return (
                <Card key={plan} className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground capitalize">{plan}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">{count}</p>
                    <p className="text-xs text-muted-foreground">users</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            {subs.filter(s => s.plan !== "free").map((s) => {
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {subs.filter(s => s.plan !== "free").length === 0 && (
              <p className="text-center text-muted-foreground py-10">No paid subscribers yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
