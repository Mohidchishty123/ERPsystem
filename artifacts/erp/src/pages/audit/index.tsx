import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function AuditLog() {
  const { isSuperAdmin } = useAuth();
  
  const [entityType, setEntityType] = useState<string>("all");
  const [date, setDate] = useState<string>("");

  const { data: logs, isLoading } = useListAuditLogs(
    { 
      entityType: entityType === "all" ? undefined : entityType,
      startDate: date || undefined,
      endDate: date || undefined
    },
    { query: { enabled: isSuperAdmin() } }
  );

  if (!isSuperAdmin()) return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              System Activity
            </CardTitle>
            <CardDescription>Immutable record of all system events.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="request">Request</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
             <div className="p-6 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="font-mono text-xs">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {log.actorName || `ID: ${log.actorId}`}
                    </TableCell>
                    <TableCell className="text-primary font-bold">
                      {log.action}
                    </TableCell>
                    <TableCell className="uppercase">
                      {log.entityType}
                    </TableCell>
                    <TableCell>
                      {log.entityId || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Shield className="h-10 w-10 mb-3 opacity-20" />
              <p>No audit logs found for the selected criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
