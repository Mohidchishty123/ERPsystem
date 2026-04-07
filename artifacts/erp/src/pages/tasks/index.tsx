import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListTasks, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Clock, AlertCircle, PlayCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("all");

  const { data: projects } = useListProjects();

  const { data: tasks, isLoading } = useListTasks({
    assignedTo: isAdmin() ? undefined : user?.id,
    projectId: projectId || undefined,
    status: status === "all" ? undefined : status
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "todo": return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Clock className="w-3 h-3 mr-1" /> To Do</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><PlayCircle className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case "in_review": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Review</Badge>;
      case "done": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "text-red-500 border-red-500/50 bg-red-500/10";
      case "high": return "text-orange-500 border-orange-500/50 bg-orange-500/10";
      case "medium": return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
      case "low": return "text-muted-foreground border-border bg-muted";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isAdmin() ? "All Tasks" : "My Tasks"}</CardTitle>
          <div className="flex gap-2">
            <Select value={projectId?.toString() || "all"} onValueChange={(val) => setProjectId(val === "all" ? null : parseInt(val))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  {isAdmin() && <TableHead>Assignee</TableHead>}
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[250px]">{task.projectName || "No Project"}</div>
                    </TableCell>
                    {isAdmin() && (
                      <TableCell className="text-sm">
                        {task.assignedToName || "Unassigned"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[10px] px-2 py-0 h-5 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tasks/${task.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <CheckSquare className="h-10 w-10 mb-3 opacity-20" />
              <p>No tasks found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
