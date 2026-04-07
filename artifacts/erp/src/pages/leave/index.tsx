import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListLeave, useGetLeaveBalances } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Plus, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function Leave() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("pending");

  const { data: leaveBalances, isLoading: balancesLoading } = useGetLeaveBalances(user?.id || 0, {
    query: { enabled: !!user?.id && !isAdmin() }
  });

  const { data: applications, isLoading } = useListLeave({
    userId: isAdmin() ? undefined : user?.id,
    status: status === "all" ? undefined : status
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch(type) {
      case "annual": return "border-blue-500/50 bg-blue-500/10 text-blue-500";
      case "sick": return "border-red-500/50 bg-red-500/10 text-red-500";
      case "unpaid": return "border-orange-500/50 bg-orange-500/10 text-orange-500";
      default: return "border-border bg-muted/50 text-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        <Link href="/leave/apply">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Apply Leave
          </Button>
        </Link>
      </div>

      {!isAdmin() && (
        <div className="grid gap-4 md:grid-cols-3">
          {balancesLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : leaveBalances?.map((balance) => (
            <Card key={balance.id} className={`border-l-4 ${getLeaveTypeColor(balance.leaveType).split(' ')[0]}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase capitalize">{balance.leaveType} Leave</p>
                  <div className="text-2xl font-bold mt-1">{balance.remaining} <span className="text-sm font-normal text-muted-foreground">days left</span></div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{balance.used} used</div>
                  <div>{balance.allocated} total</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Leave Applications</CardTitle>
            <CardDescription>{isAdmin() ? "Review pending requests" : "Your leave history"}</CardDescription>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : applications && applications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin() && <TableHead>Employee</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    {isAdmin() && (
                      <TableCell>
                        <div className="font-medium">{app.userFullName}</div>
                        <div className="text-xs text-muted-foreground">{app.departmentName}</div>
                      </TableCell>
                    )}
                    <TableCell className="capitalize">{app.leaveType}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(app.startDate), "MMM d")} - {format(new Date(app.endDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{app.daysCount}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/leave/${app.id}`}>
                        <Button variant="ghost" size="sm">
                          {isAdmin() && app.status === "pending" ? "Review" : "View"}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Plane className="h-10 w-10 mb-3 opacity-20" />
              <p>No leave applications found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
