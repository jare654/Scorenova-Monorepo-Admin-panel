import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";
import { adminUsers } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiScanner, setAiScanner] = useState(true);
  const [mockExams, setMockExams] = useState(true);
  const [shortAnswer, setShortAnswer] = useState(false);
  const [contentModeration, setContentModeration] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
  };

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="general">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Admin Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">General Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>App Name</Label>
                <Input defaultValue="AI Exam Prep Ethiopia" />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input defaultValue="support@aiexamprep.et" />
              </div>
              <div>
                <Label>Force App Update Version</Label>
                <Input defaultValue="2.1.0" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Temporarily disable the app for all users</p>
              </div>
              <div className="flex items-center gap-2">
                {maintenanceMode && <AlertTriangle className="h-4 w-4 text-warning" />}
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Feature Toggles</h3>
            {[
              { label: "Enable AI Scanner", desc: "Allow users to scan questions using camera", state: aiScanner, set: setAiScanner },
              { label: "Enable Mock Exams", desc: "Enable timed mock exam functionality", state: mockExams, set: setMockExams },
              { label: "Enable Short Answer Questions", desc: "Allow open-ended question types", state: shortAnswer, set: setShortAnswer },
              { label: "Content Moderation", desc: "Auto-review user-generated content", state: contentModeration, set: setContentModeration },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.state} onCheckedChange={item.set} />
              </div>
            ))}
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">AI Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Free User Daily Limit</Label>
                <Input type="number" defaultValue="10" />
              </div>
              <div>
                <Label>Premium User Daily Limit</Label>
                <Input defaultValue="Unlimited" />
              </div>
              <div>
                <Label>Primary Model</Label>
                <Select defaultValue="mistral">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mistral">Mistral 7B</SelectItem>
                    <SelectItem value="llama">Llama 3</SelectItem>
                    <SelectItem value="gpt4">GPT-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>OCR Model</Label>
                <Select defaultValue="paddle">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paddle">PaddleOCR</SelectItem>
                    <SelectItem value="tesseract">Tesseract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Payment Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Monthly Premium Price (ETB)</Label>
                <Input type="number" defaultValue="99" />
              </div>
              <div>
                <Label>Annual Premium Price (ETB)</Label>
                <Input type="number" defaultValue="899" />
              </div>
              <div>
                <Label>Trial Period (Days)</Label>
                <Input type="number" defaultValue="7" />
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Notification Settings</h3>
            {[
              { label: "Email Notifications", desc: "Receive email alerts for important events" },
              { label: "Daily Reports", desc: "Get daily summary emails" },
              { label: "Payment Alerts", desc: "Notify on failed payments" },
              { label: "User Milestones", desc: "Alert when users hit 1000 questions" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Admin Users</h3>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Admin</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((admin) => (
                  <tr key={admin.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{admin.name}</td>
                    <td className="p-3 text-muted-foreground">{admin.email}</td>
                    <td className="p-3"><Badge variant="outline">{admin.role}</Badge></td>
                    <td className="p-3 text-muted-foreground">{admin.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

