import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetRequest, useUpdateRequest, getListRequestsQueryKey, getGetRequestQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText, Search } from "lucide-react";
import { format } from "date-fns";

export default function RequestDetail() {
  const { id } = useParams();
  const requestId = parseInt(id || "0");
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const { data: req, isLoading } = useGetRequest(requestId);

  const updateMutation = useUpdateRequest({
    mutation: {
      onSuccess: () => {
        toast({ title: "Request updated" });
        queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(requestId) });
        queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Failed to update", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const handleReview = (status: "approved" | "rejected" | "in_review") => {
    updateMutation.mutate({
      id: requestId,
      data: { status, reviewerRemarks: remarks || undefined }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-500 text-sm px-3 py-1"><Clock className="w-4 h-4 mr-1" /> Pending</Badge>;
      case "in_review": return <Badge className="bg-blue-500/10 text-blue-500 text-sm px-3 py-1"><Search className="w-4 h-4 mr-1" /> In Review</Badge>;
      case "approved": return <Badge className="bg-green-500/10 text-green-500 text-sm px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1" /> Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 text-sm px-3 py-1"><XCircle className="w-4 h-4 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!req) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/requests")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Request #R-{req.id.toString().padStart(4, '0')}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {req.title}
              </CardTitle>
              <CardDescription className="capitalize mt-1 font-mono text-xs">
                Type: {req.requestType.replace(/_/g, " ")}
              </CardDescription>
            </div>
            {getStatusBadge(req.status)}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-8 border-b border-border pb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-1">Requester</p>
                <p className="font-medium text-sm">{req.userFullName}</p>
                <p className="text-xs text-muted-foreground">{req.departmentName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-1">Submitted On</p>
                <p className="text-sm">{format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Description & Justification</p>
              <div className="bg-background border border-border p-4 rounded-md text-sm leading-relaxed whitespace-pre-wrap">
                {req.description}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {(req.status === "approved" || req.status === "rejected") ? (
            <Card className="border-border">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-lg">Review Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Reviewed By</p>
                  <p className="font-medium text-sm">{req.reviewerName || "System"}</p>
                </div>
                {req.reviewerRemarks && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Remarks</p>
                    <p className="text-sm bg-muted p-3 rounded border border-border">{req.reviewerRemarks}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 font-mono">Date</p>
                  <p className="text-sm">{format(new Date(req.updatedAt), "MMM d, yyyy HH:mm")}</p>
                </div>
              </CardContent>
            </Card>
          ) : isAdmin() ? (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-primary/5 border-b border-border pb-4">
                <CardTitle className="text-lg">Take Action</CardTitle>
                <CardDescription>Review this request</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-xs uppercase font-mono">Review Notes (Optional)</Label>
                  <Textarea 
                    id="remarks"
                    placeholder="Add explanation for decision..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="resize-none h-24"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  {req.status === "pending" && (
                    <Button 
                      variant="outline"
                      className="w-full text-blue-500 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-600" 
                      onClick={() => handleReview("in_review")}
                      disabled={updateMutation.isPending}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Mark In Review
                    </Button>
                  )}
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
                <p className="text-sm">This request is pending review by management.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
