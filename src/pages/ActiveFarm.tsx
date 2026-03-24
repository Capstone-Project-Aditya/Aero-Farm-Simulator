import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Loader2, Plus, CheckCircle2, Circle, Download, Leaf } from "lucide-react";
import { getCropKeys, CROPS } from "@/lib/simulation";
import { generateIcsContent, downloadIcsFile } from "@/lib/calendar";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

export default function ActiveFarm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("lettuce");
  const [activeCrop, setActiveCrop] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const fetchActiveFarm = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Get the current active crop
      const { data: cropData, error: cropErr } = await supabase
        .from("active_crops")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cropErr) {
        console.error("Error fetching active crop:", cropErr);
        toast.error("Failed to load active crop data.");
        return;
      }

      setActiveCrop(cropData);

      if (cropData) {
        // Fetch tasks
        const { data: taskData, error: taskErr } = await supabase
          .from("crop_tasks" as any)
          .select("*")
          .eq("active_crop_id", cropData.id)
          .order("day_offset", { ascending: true });

        if (!taskErr && taskData) {
          setTasks(taskData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveFarm();
  }, [user]);

  const handleStartCycle = async () => {
    if (!user) return;
    setStarting(true);
    
    try {
      // 1. Call Gemini to generate the day-by-day plan
      toast.loading("AI is generating your custom daily plan...", { id: "gemini-plan" });
      
      const { data: fnData, error: fnError } = await supabase.functions.invoke("gemini-calendar", {
        body: { crop_key: selectedCrop }
      });

      if (fnError || !fnData?.tasks) {
        throw new Error("Failed to generate AI plan. Please check your Supabase deployment.");
      }

      const aiTasks = fnData.tasks; // Array of { day_offset, title, description }

      // 2. Create the active crop record
      const { data: cropData, error: cropErr } = await supabase
        .from("active_crops")
        .insert({
          user_id: user.id,
          crop_key: selectedCrop,
          status: "active"
        })
        .select()
        .single();

      if (cropErr) throw cropErr;

      // 3. Insert the tasks
      const startDate = new Date();
      const taskInserts = aiTasks.map((t: any) => ({
        active_crop_id: cropData.id,
        user_id: user.id,
        day_offset: t.day_offset,
        task_date: addDays(startDate, t.day_offset).toISOString(),
        title: t.title,
        description: t.description || ""
      }));

      const { error: taskErr } = await supabase.from("crop_tasks" as any).insert(taskInserts);
      if (taskErr) throw taskErr;

      toast.success("Farm cycle started! Your daily plan is ready.", { id: "gemini-plan" });
      await fetchActiveFarm();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong.", { id: "gemini-plan" });
    } finally {
      setStarting(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
      
      const { error } = await supabase
        .from("crop_tasks" as any)
        .update({ is_completed: !currentStatus })
        .eq("id", taskId);

      if (error) {
        throw error;
      }
    } catch (err) {
      toast.error("Failed to update task.");
      fetchActiveFarm(); // Revert on error
    }
  };

  const handleFinishCycle = async () => {
    if (!activeCrop) return;
    try {
      const { error } = await supabase
        .from("active_crops" as any)
        .update({ status: "harvested" })
        .eq("id", activeCrop.id);
        
      if (error) throw error;
      
      toast.success("Crop harvested! Cycle complete.");
      setActiveCrop(null);
      setTasks([]);
    } catch (err) {
      toast.error("Failed to complete cycle.");
    }
  };

  const handleExportCalendar = () => {
    if (tasks.length === 0 || !activeCrop) return;

    const cropName = CROPS[activeCrop.crop_key]?.name || activeCrop.crop_key;
    const events = tasks.map(t => ({
      title: `[AeroFarm] ${cropName}: ${t.title}`,
      description: t.description,
      startDate: new Date(t.task_date),
      endDate: addDays(new Date(t.task_date), 1) // All day event roughly
    }));

    const icsContent = generateIcsContent(events, `AeroFarm ${cropName} Schedule`);
    downloadIcsFile(icsContent, `aerofarm-${cropName}-schedule.ics`);
    toast.success("Calendar file downloaded! Open it to add reminders to your phone.");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            My Active Farm
          </h2>
          <p className="text-muted-foreground mt-1">
            Track your live crop cycle, get daily AI-generated tasks, and sync to your calendar.
          </p>
        </div>
        {activeCrop && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCalendar}>
              <Download className="mr-2 h-4 w-4" />
              Export .ics Calendar
            </Button>
            <Button variant="default" onClick={handleFinishCycle}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Harvest
            </Button>
          </div>
        )}
      </div>

      {!activeCrop ? (
        <Card className="shadow-card max-w-xl mx-auto mt-12">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="font-display text-xl">Start a New Crop Cycle</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a crop, and Gemini AI will generate a custom day-by-day task schedule 
              from sowing to harvest. You can then sync it to Google/Apple Calendar.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Crop to Grow</label>
              <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCropKeys().map((k) => (
                    <SelectItem key={k} value={k}>
                      {CROPS[k].emoji} {CROPS[k].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" size="lg" onClick={handleStartCycle} disabled={starting}>
              {starting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Plus className="mr-2 h-5 w-5" />
              )}
              {starting ? "Generating AI Schedule..." : "Start Farm Cycle"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Growth Schedule
            </h3>
            
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks found for this cycle.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isPast = new Date(task.task_date) < new Date(new Date().setHours(0,0,0,0));
                  const isToday = format(new Date(task.task_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  
                  return (
                    <Card key={task.id} className={`shadow-sm transition-all ${task.is_completed ? 'opacity-60 bg-muted/30' : ''} ${isToday ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="p-4 flex gap-4 items-start">
                        <button 
                          onClick={() => handleToggleTask(task.id, task.is_completed)}
                          className="mt-1 shrink-0 hover:scale-110 transition-transform"
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <h4 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              Day {task.day_offset}: {task.title}
                            </h4>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isToday ? 'bg-primary/10 text-primary' : isPast && !task.is_completed ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                              {format(new Date(task.task_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <p className={`text-sm ${task.is_completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {task.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Card className="shadow-card sticky top-6">
              <CardHeader>
                <CardTitle className="text-base font-display">Cycle Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Crop</span>
                  <span className="font-medium flex items-center gap-1">
                    {CROPS[activeCrop.crop_key]?.emoji} {CROPS[activeCrop.crop_key]?.name}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">{format(new Date(activeCrop.start_date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {tasks.filter(t => t.is_completed).length} / {tasks.length} Tasks
                  </span>
                </div>
                
                <div className="pt-2 rounded-lg bg-primary/5 p-4 mt-4">
                  <h4 className="font-medium mb-1 flex items-center gap-2 text-primary">
                    <Download className="h-4 w-4" /> Sync to Phone
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Don't miss a day. Export this schedule to Google or Apple Calendar to get automatic push notifications.
                  </p>
                  <Button className="w-full text-xs" size="sm" onClick={handleExportCalendar}>
                    Export .ics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
