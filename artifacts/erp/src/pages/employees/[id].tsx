import { useAuth } from "@/hooks/use-auth";
import { useGetUser, useUpdateUser, useDeactivateUser, getListUsersQueryKey, getGetUserStatsQueryKey, getGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Building, Briefcase, Calendar, Shield, Ban } from "lucide-react";

export default function EmployeeDetail() {
  const { id } = useParams();
  const userId = parseInt(id || "0");
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetUser(userId);
  
  const deactivateMutation = useDeactivateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Employee deactivated" });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
      }
    }
  });

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
        {isAdmin() && user.employmentStatus !== "inactive" && user.role !== "super_admin" && (
          <Button 
            variant="destructive" 
            onClick={() => {
              if (confirm("Are you sure you want to deactivate this employee?")) {
                deactivateMutation.mutate({ id: userId });
              }
            }}
            disabled={deactivateMutation.isPending}
          >
            <Ban className="w-4 h-4 mr-2" />
            Deactivate
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-border">
        <div className="h-32 bg-muted/50 border-b border-border"></div>
        <CardContent className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-12 mb-6">
            <Avatar className="h-32 w-32 border-4 border-background bg-muted">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-3xl">{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{user.fullName}</h2>
                {user.employmentStatus === "active" ? (
                  <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
                <Badge variant="outline" className="capitalize">{user.role.replace("_", " ")}</Badge>
              </div>
              <p className="text-muted-foreground">{user.position || "No position set"} • {user.departmentName || "No department"}</p>
            </div>
            {isAdmin() && (
              <Button variant="outline" onClick={() => setLocation(`/employees/${user.id}/edit`)}>
                Edit Profile
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{user.phone || "Not provided"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Employment Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{user.departmentName || "No department"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Joined {user.joinDate ? format(new Date(user.joinDate), "MMMM d, yyyy") : "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">Role: {user.role.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Leave</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>Recent attendance records for this employee.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Attendance history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="leave" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances</CardTitle>
              <CardDescription>Current leave allocation and usage.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Leave balances will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Tasks</CardTitle>
              <CardDescription>Tasks currently assigned to this employee.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Assigned tasks will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}