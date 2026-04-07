import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetLeave, useUpdateLeave, getListLeaveQueryKey, getGetLeaveQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

export default function LeaveDetail() {
  const { id } = useParams();
  const leaveId = parseInt(id || "0");
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const { data: leave, isLoading } = useGetLeave(leaveId);

  const updateMutation = useUpdateLeave({
    mutation: {
      onSuccess: () => {
        toast({ title: "Leave request updated" });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(leaveId) });
        queryClient.invalidateQueries({ queryKey: getListLeaveQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Failed to update", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const handleReview = (status: "approved" | "rejected") => {
    updateMutation.mutate({
      id: leaveId,
      data: { status, reviewerRemarks: remarks || undefined }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!leave) return <div>Not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/leave")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Leave Request Detail</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between bg-muted/20 border-b border-border pb-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {leave.userFullName}
              </CardTitle>
              <CardDescription className="mt-1">{leave.departmentName}</CardDescription>
            </div>
            {leave.status === "approved" && <Badge className="bg-green-500/10 text-green-500 text-sm px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1" /> Approved</Badge>}
            {leave.status === "rejected" && <Badge className="bg-red-500/10 text-red-500 text-sm px-3 py-1"><XCircle className="w-4 h-4 mr-1" /> Rejected</Badge>}
            {leave.status === "pending" && <Badge className="bg-yellow-500/10 text-yellow-500 text-sm px-3 py-1"><Clock className="w-4 h-4 mr-1" /> Pending</Badge>}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Leave Type</p>
                <p className="font-medium capitalize text-lg">{leave.leaveType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Duration</p>
                <p className="font-medium font-mono text-lg">{leave.daysCount} <span className="text-sm font-normal text-muted-foreground">Days</span></p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Dates</p>
                <p className="font-medium">
                  {format(new Date(leave.startDate), "EEEE, MMM d, yyyy")} 
                  <span className="mx-2 text-muted-foreground">to</span> 
                  {format(new Date(leave.endDate), "EEEE, MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Reason</p>
              <p className="whitespace-pre-wrap bg-muted/30 p-4 rounded-md border border-border text-sm leading-relaxed">
                {leave.reason}
              </p>
            </div>

            <div className="text-xs text-muted-foreground pt-4 flex justify-between">
              <span>Submitted: {format(new Date(leave.createdAt), "MMM d, yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {leave.status !== "pending" ? (
            <Card className="border-border">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-lg">Review Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Reviewed By</p>
                  <p className="font-medium text-sm">{leave.reviewerName || "System"}</p>
                </div>
                {leave.reviewerRemarks && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Remarks</p>
                    <p className="text-sm bg-muted p-3 rounded border border-border">{leave.reviewerRemarks}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Date</p>
                  <p className="text-sm">{format(new Date(leave.updatedAt), "MMM d, yyyy HH:mm")}</p>
                </div>
              </CardContent>
            </Card>
          ) : isAdmin() ? (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-primary/5 border-b border-border pb-4">
                <CardTitle className="text-lg">Action Required</CardTitle>
                <CardDescription>Review this leave application</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-xs uppercase font-mono">Remarks (Optional)</Label>
                  <Textarea 
                    id="remarks"
                    placeholder="Add notes for the employee..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="resize-none h-24"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleReview("approved")}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve Request
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-600" 
                    onClick={() => handleReview("rejected")}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500/50" />
                <p className="text-sm">Your application is currently being reviewed by your department head.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
