import { useAuth } from "@/hooks/use-auth";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, Info, AlertTriangle, MessageSquare, DollarSign, Plane } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useListNotifications();

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    }
  });

  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        toast({ title: "All notifications marked as read" });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    }
  });

  const getIcon = (type: string) => {
    switch(type) {
      case "leave": return <Plane className="w-5 h-5 text-blue-500" />;
      case "complaint": return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "payroll": return <DollarSign className="w-5 h-5 text-green-500" />;
      case "message": return <MessageSquare className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id });
  };

  const hasUnread = notifications?.some(n => !n.isRead);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        {hasUnread && (
          <Button 
            variant="outline" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 flex gap-4 transition-colors ${n.isRead ? 'opacity-70 bg-background' : 'bg-primary/5 hover:bg-primary/10 cursor-pointer'}`}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                >
                  <div className={`rounded-full p-2 h-fit ${n.isRead ? 'bg-muted' : 'bg-background shadow-sm border border-primary/20'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-4 font-mono">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-sm ${!n.isRead ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                      {n.body}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Bell className="h-10 w-10 mb-3 opacity-20" />
              <p>You have no notifications.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
