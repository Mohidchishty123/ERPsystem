import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetTask, useUpdateTask, useListTaskComments, useCreateTaskComment, getGetTaskQueryKey, getListTaskCommentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckSquare, Clock, Calendar, MessageSquare, Send } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function TaskDetail() {
  const { id } = useParams();
  const taskId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newComment, setNewComment] = useState("");

  const { data: task, isLoading: taskLoading } = useGetTask(taskId);
  const { data: comments, isLoading: commentsLoading } = useListTaskComments(taskId);

  const updateMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        toast({ title: "Task updated" });
        queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      }
    }
  });

  const commentMutation = useCreateTaskComment({
    mutation: {
      onSuccess: () => {
        setNewComment("");
        queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
        queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) }); // Update comment count
      },
      onError: (error) => {
        toast({ title: "Failed to comment", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ id: taskId, data: { status } });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({ id: taskId, data: { body: newComment } });
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-muted text-muted-foreground border-border";
      default: return "";
    }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (taskLoading) {
    return <Skeleton className="h-[600px] w-full max-w-4xl mx-auto" />;
  }

  if (!task) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(task.projectId ? `/projects/${task.projectId}` : "/tasks")} className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-muted-foreground font-mono text-xs">#{task.id}</span>
              <Badge variant="outline" className={`capitalize ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>
              {task.projectName && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {task.projectName}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.description || <span className="text-muted-foreground italic">No description provided.</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                {commentsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={comment.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(comment.userFullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-medium text-sm">{comment.userFullName}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm bg-muted/30 border border-border p-3 rounded-lg rounded-tl-none whitespace-pre-wrap">
                          {comment.body}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground text-sm italic py-4">
                    No comments yet.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex gap-4 items-start">
                 <Textarea 
                  placeholder="Add a comment..."
                  className="min-h-[80px] resize-none"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button 
                  size="icon" 
                  className="h-[80px] w-12 shrink-0" 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentMutation.isPending}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="bg-muted/20 border-b border-border pb-4">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Assignee</p>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Avatar className="h-5 w-5 border border-border">
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {task.assignedToName ? getInitials(task.assignedToName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  {task.assignedToName || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Due Date</p>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {task.dueDate ? format(new Date(task.dueDate), "MMMM d, yyyy") : "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Created</p>
                <p className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {format(new Date(task.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
