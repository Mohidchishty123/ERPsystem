import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListComplaints } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function Complaints() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("all");

  const { data: complaints, isLoading } = useListComplaints({
    status: status === "all" ? undefined : status
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><MessageSquare className="w-3 h-3 mr-1" /> New</Badge>;
      case "under_review": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> In Review</Badge>;
      case "resolved": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case "escalated": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><ShieldAlert className="w-3 h-3 mr-1" /> Escalated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "harassment": return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "workplace": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <MessageSquare className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Complaints & Grievances</h1>
        {!isAdmin() && (
          <Link href="/complaints/submit">
            <Button variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              File a Complaint
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Case Directory</CardTitle>
            <CardDescription>{isAdmin() ? "Manage employee grievances" : "Your submitted cases"}</CardDescription>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">New</SelectItem>
              <SelectItem value="under_review">In Review</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : complaints && complaints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Subject</TableHead>
                  {isAdmin() && <TableHead>Complainant</TableHead>}
                  <TableHead>Date Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #C-{c.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(c.category)}
                        <span className="font-medium truncate max-w-[200px]">{c.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{c.category.replace("_", " ")}</div>
                    </TableCell>
                    {isAdmin() && (
                      <TableCell>
                        <div className="font-medium">{c.isAnonymous ? "Anonymous" : c.userFullName}</div>
                        {!c.isAnonymous && <div className="text-xs text-muted-foreground">{c.departmentName}</div>}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/complaints/${c.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Open Case
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <ShieldAlert className="h-10 w-10 mb-3 opacity-20" />
              <p>No complaints found matching criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
