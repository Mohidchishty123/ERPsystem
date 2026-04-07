import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetProject, useListTasks, useUpdateTask, useCreateTask, useListUsers, getListTasksQueryKey, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Calendar, Briefcase, CheckSquare, Clock } from "lucide-react";
import { format } from "date-fns";

const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.coerce.number().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional(),
});

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useListTasks({ projectId });
  const { data: users } = useListUsers({ status: "active" }, { query: { enabled: isAdmin() } });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "medium", dueDate: "" },
  });

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        toast({ title: "Task created" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsCreateTaskOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    createTaskMutation.mutate({ data: { ...values, projectId } });
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  if (projectLoading || tasksLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!project) return <div>Not found</div>;

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "in_review", title: "In Review" },
    { id: "done", title: "Done" },
  ];

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-muted text-muted-foreground border-border";
      default: return "";
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")} className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
              <Badge variant="outline" className="capitalize">{project.status.replace("_", " ")}</Badge>
              <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "No deadline"}</span>
              <span className="flex items-center"><CheckSquare className="w-3 h-3 mr-1" /> {project.completedTaskCount} / {project.taskCount} Tasks</span>
            </div>
          </div>
        </div>

        {isAdmin() && (
          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Implement login UI..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map((col) => (
          <div key={col.id} className="w-[300px] flex-shrink-0 flex flex-col bg-muted/20 rounded-xl border border-border">
            <div className="p-3 border-b border-border bg-muted/40 rounded-t-xl font-medium text-sm flex items-center justify-between">
              {col.title}
              <Badge variant="secondary" className="font-mono text-xs">
                {tasks?.filter(t => t.status === col.id).length || 0}
              </Badge>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {tasks?.filter(t => t.status === col.id).map((task) => (
                <Card key={task.id} className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group" onClick={() => setLocation(`/tasks/${task.id}`)}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 capitalize ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">#{task.id}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug mb-3">{task.title}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {task.assignedToName || "Unassigned"}
                      </div>
                      {task.dueDate && (
                        <div className="text-[10px] text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </div>
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 top-0 bg-background/90 backdrop-blur-sm flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex rounded-lg z-10 p-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium mb-1">Move to:</p>
                      <Select value={task.status} onValueChange={(val) => handleStatusChange(task.id, val)}>
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(c => (
                            <SelectItem key={c.id} value={c.id} disabled={c.id === task.status} className="text-xs">
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="secondary" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => setLocation(`/tasks/${task.id}`)}>
                        View Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
