import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetTodayAttendance, useClockIn, useClockOut } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTodayAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

export default function AttendancePortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  });

  const { data: attendance, isLoading } = useGetTodayAttendance();

  const clockInMutation = useClockIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: "Clocked in successfully" });
      },
      onError: (error) => {
        toast({ title: "Failed to clock in", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const clockOutMutation = useClockOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: "Clocked out successfully" });
      },
      onError: (error) => {
        toast({ title: "Failed to clock out", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const isClockedIn = !!attendance?.clockInAt;
  const isClockedOut = !!attendance?.clockOutAt;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  const getDuration = () => {
    if (!attendance?.clockInAt) return null;
    const start = new Date(attendance.clockInAt);
    const end = attendance.clockOutAt ? new Date(attendance.clockOutAt) : currentTime;
    const h = differenceInHours(end, start);
    const m = differenceInMinutes(end, start) % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Attendance Portal</h1>
          <p className="text-muted-foreground">{user?.fullName} • {user?.departmentName || "No Department"}</p>
        </div>

        <Card className="border-border shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary"></div>
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-mono text-6xl tracking-tighter text-primary">
              {format(currentTime, "HH:mm:ss")}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border border-border/50">
                  {!isClockedIn ? (
                    <>
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Not clocked in yet today</p>
                    </>
                  ) : !isClockedOut ? (
                    <>
                      <div className="rounded-full bg-primary/10 p-3 mb-3">
                        <Activity className="h-6 w-6 text-primary animate-pulse" />
                      </div>
                      <p className="text-sm font-medium">Clocked in at <span className="text-primary font-mono">{format(new Date(attendance.clockInAt!), "HH:mm")}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">Current session: <span className="font-mono">{getDuration()}</span></p>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-green-500/10 p-3 mb-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="text-sm font-medium">Shift completed for today</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-mono">
                        <span>In: {format(new Date(attendance.clockInAt!), "HH:mm")}</span>
                        <span>Out: {format(new Date(attendance.clockOutAt!), "HH:mm")}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground mt-2">Total time: {getDuration()}</p>
                    </>
                  )}
                </div>

                {!isClockedIn ? (
                  <Button 
                    className="w-full h-14 text-lg font-medium tracking-wide" 
                    onClick={() => clockInMutation.mutate()}
                    disabled={isPending}
                  >
                    {isPending ? "Clocking in..." : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Clock In
                      </>
                    )}
                  </Button>
                ) : !isClockedOut ? (
                  <Button 
                    variant="outline" 
                    className="w-full h-14 text-lg font-medium tracking-wide border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                    onClick={() => clockOutMutation.mutate()}
                    disabled={isPending}
                  >
                    {isPending ? "Clocking out..." : (
                      <>
                        <LogOut className="mr-2 h-5 w-5" />
                        Clock Out
                      </>
                    )}
                  </Button>
                ) : (
                  <Button className="w-full h-14 text-lg" variant="secondary" disabled>
                    Done for the day
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
