import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListAttendance, useListDepartments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Filter, Download } from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

export default function Attendance() {
  const { user, isAdmin } = useAuth();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const { data: departments } = useListDepartments({
    query: { enabled: isAdmin() }
  });

  const { data: records, isLoading } = useListAttendance({
    userId: isAdmin() ? undefined : user?.id,
    departmentId: departmentId || undefined,
    startDate: date,
    endDate: date
  });

  const getDuration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "-";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const h = differenceInHours(endDate, startDate);
    const m = differenceInMinutes(endDate, startDate) % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Attendance Records</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              {isAdmin() && (
                <Select
                  value={departmentId?.toString() || "all"}
                  onValueChange={(val) => setDepartmentId(val === "all" ? null : parseInt(val))}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="flex gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">On Time</Badge>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Late</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin() && <TableHead>Employee</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    {isAdmin() && (
                      <TableCell className="font-medium">{r.userFullName}</TableCell>
                    )}
                    <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.clockInAt ? format(new Date(r.clockInAt), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.clockOutAt ? format(new Date(r.clockOutAt), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {getDuration(r.clockInAt, r.clockOutAt)}
                    </TableCell>
                    <TableCell>
                      {r.isLate ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Late</Badge>
                      ) : r.clockInAt ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">On Time</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Absent</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <CalendarCheck className="h-10 w-10 mb-3 opacity-20" />
              <p>No attendance records found for this date.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
