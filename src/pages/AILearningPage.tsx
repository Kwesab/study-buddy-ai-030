import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, GraduationCap } from "lucide-react";
import ChatTab from "@/components/ai-learning/ChatTab";
import TeacherTab from "@/components/ai-learning/TeacherTab";

export default function AILearningPage() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-display font-bold text-foreground">AI Learning Hub</h1>
        <p className="text-muted-foreground mt-1">Chat with your tutor or start structured lessons</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 w-full max-w-sm shrink-0 mb-4">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" /> AI Tutor
          </TabsTrigger>
          <TabsTrigger value="teacher" className="gap-2">
            <GraduationCap className="w-4 h-4" /> AI Teacher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
          <ChatTab />
        </TabsContent>

        <TabsContent value="teacher" className="flex-1 overflow-auto mt-0">
          <TeacherTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
