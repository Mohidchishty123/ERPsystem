import { useAuth } from "@/hooks/use-auth";
import { useGetDashboardStats, useGetTodayAttendance, useListNotifications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, UserCheck, UserMinus, CalendarX, 
  MessageSquare, FileText, CheckSquare, DollarSign,
  Clock, Activity, Bell
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { enabled: !!user && (isSuperAdmin() || isAdmin()) }
  });

  const { data: attendance, isLoading: attendanceLoading } = useGetTodayAttendance();
  const { data: notifications, isLoading: notificationsLoading } = useListNotifications({ isRead: false });

  if (statsLoading || attendanceLoading || notificationsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-muted-foreground font-mono text-sm">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {user && (isSuperAdmin() || isAdmin()) && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Employees" value={stats.totalEmployees} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Present Today" value={stats.presentToday} icon={<UserCheck className="h-4 w-4 text-green-500" />} />
          <StatCard title="On Leave" value={stats.onLeaveToday} icon={<UserMinus className="h-4 w-4 text-yellow-500" />} />
          <StatCard title="Pending Leave" value={stats.pendingLeaveRequests} icon={<CalendarX className="h-4 w-4 text-orange-500" />} />
          <StatCard title="Pending Complaints" value={stats.pendingComplaints} icon={<MessageSquare className="h-4 w-4 text-red-500" />} />
          <StatCard title="Open Tasks" value={stats.openTasks} icon={<CheckSquare className="h-4 w-4 text-blue-500" />} />
          {isSuperAdmin() && (
            <StatCard title="Payroll Due" value={stats.payrollDue} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
          )}
        </div>
      )}

      {user && !isSuperAdmin() && !isAdmin() && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {attendance?.clockInAt 
                  ? attendance.clockOutAt 
                    ? "Clocked Out" 
                    : "Clocked In" 
                  : "Not Clocked In"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {attendance?.clockInAt ? `In at ${format(new Date(attendance.clockInAt), "HH:mm")}` : "Action required"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications?.length || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity?.length ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.actorName} - {activity.type}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {format(new Date(activity.createdAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Your Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                All caught up!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
