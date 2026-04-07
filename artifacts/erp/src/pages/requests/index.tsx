import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { format } from "date-fns";

export default function Requests() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("all");

  const { data: requests, isLoading } = useListRequests({
    userId: isAdmin() ? undefined : user?.id,
    status: status === "all" ? undefined : status
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "in_review": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Search className="w-3 h-3 mr-1" /> In Review</Badge>;
      case "approved": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
        <Link href="/requests/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Request
          </Button>
        </Link>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Request Directory</CardTitle>
            <CardDescription>{isAdmin() ? "Manage employee requests" : "Your submitted requests"}</CardDescription>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
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
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Type & Title</TableHead>
                  {isAdmin() && <TableHead>Employee</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #R-{r.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium truncate max-w-[250px]">{r.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{r.requestType.replace(/_/g, " ")}</div>
                    </TableCell>
                    {isAdmin() && (
                      <TableCell>
                        <div className="font-medium">{r.userFullName}</div>
                        <div className="text-xs text-muted-foreground">{r.departmentName}</div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/requests/${r.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <FileText className="h-10 w-10 mb-3 opacity-20" />
              <p>No requests found matching criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
