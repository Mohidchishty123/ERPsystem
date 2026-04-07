import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetComplaint, useUpdateComplaint, getListComplaintsQueryKey, getGetComplaintQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function ComplaintDetail() {
  const { id } = useParams();
  const complaintId = parseInt(id || "0");
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState<string>("");
  const [response, setResponse] = useState<string>("");

  const { data: complaint, isLoading } = useGetComplaint(complaintId);

  // Sync state when data loads
  useState(() => {
    if (complaint && !status) {
      setStatus(complaint.status);
      setResponse(complaint.response || "");
    }
  });

  const updateMutation = useUpdateComplaint({
    mutation: {
      onSuccess: () => {
        toast({ title: "Case updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetComplaintQueryKey(complaintId) });
        queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Update failed", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const handleUpdate = () => {
    updateMutation.mutate({
      id: complaintId,
      data: { status, response: response || undefined }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge className="bg-blue-500/10 text-blue-500 text-sm px-3 py-1"><MessageSquare className="w-4 h-4 mr-1" /> New</Badge>;
      case "under_review": return <Badge className="bg-yellow-500/10 text-yellow-500 text-sm px-3 py-1"><Clock className="w-4 h-4 mr-1" /> In Review</Badge>;
      case "resolved": return <Badge className="bg-green-500/10 text-green-500 text-sm px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1" /> Resolved</Badge>;
      case "escalated": return <Badge className="bg-red-500/10 text-red-500 text-sm px-3 py-1"><ShieldAlert className="w-4 h-4 mr-1" /> Escalated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!complaint) return <div>Not found</div>;

  const isResolved = complaint.status === "resolved";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/complaints")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Case #C-{complaint.id.toString().padStart(4, '0')}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl leading-tight text-primary">{complaint.title}</CardTitle>
              <CardDescription className="capitalize flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                Category: {complaint.category.replace("_", " ")}
              </CardDescription>
            </div>
            {getStatusBadge(complaint.status)}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-8 border-b border-border pb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-1">Complainant</p>
                <p className="font-medium text-sm">
                  {complaint.isAnonymous ? "Anonymous User" : complaint.userFullName}
                </p>
                {!complaint.isAnonymous && <p className="text-xs text-muted-foreground">{complaint.departmentName}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-1">Filed On</p>
                <p className="text-sm">{format(new Date(complaint.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2">Description</p>
              <div className="bg-background border border-border rounded-md p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </div>
            </div>

            {complaint.response && (!isAdmin() || isResolved) && (
              <div className="mt-8">
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2 flex items-center text-primary">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  Official Response
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-md p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {complaint.response}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin() && (
          <Card className="border-border">
            <CardHeader className="bg-muted/20 border-b border-border pb-4">
              <CardTitle className="text-lg">Case Management</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase font-mono tracking-wider">Update Status</Label>
                <Select 
                  value={status || complaint.status} 
                  onValueChange={setStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">New / Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase font-mono tracking-wider">HR Response</Label>
                <Textarea 
                  placeholder="Official response sent to complainant..."
                  value={response || complaint.response || ""}
                  onChange={(e) => setResponse(e.target.value)}
                  className="min-h-[150px] text-sm"
                />
                <p className="text-[10px] text-muted-foreground">This response is visible to the complainant.</p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleUpdate}
                disabled={updateMutation.isPending || (status === complaint.status && response === (complaint.response || ""))}
              >
                {updateMutation.isPending ? "Saving..." : "Save Case Changes"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
