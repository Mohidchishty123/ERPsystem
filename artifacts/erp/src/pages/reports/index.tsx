import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetAttendanceReport, useGetLeaveReport, useGetPayrollReport, useListDepartments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const { isSuperAdmin, isAdmin } = useAuth();
  
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  
  const currentDate = new Date();
  const [reportYear, setReportYear] = useState<number>(currentDate.getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(currentDate.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const { data: departments } = useListDepartments({
    query: { enabled: isSuperAdmin() || isAdmin() }
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useGetAttendanceReport(
    { 
      startDate: dateRange.start, 
      endDate: dateRange.end,
      departmentId: departmentId || undefined
    },
    { query: { enabled: isSuperAdmin() || isAdmin() } }
  );

  const { data: leaveData, isLoading: leaveLoading } = useGetLeaveReport(
    { 
      year: reportYear,
      departmentId: departmentId || undefined
    },
    { query: { enabled: isSuperAdmin() || isAdmin() } }
  );

  const { data: payrollData, isLoading: payrollLoading } = useGetPayrollReport(
    { month: reportMonth, year: reportYear },
    { query: { enabled: isSuperAdmin() } }
  );

  if (!isAdmin()) return <div>Unauthorized</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        
        <Select
          value={departmentId?.toString() || "all"}
          onValueChange={(val) => setDepartmentId(val === "all" ? null : parseInt(val))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map(d => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          {isSuperAdmin() && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4 pt-4">
          <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Start:</label>
              <Input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">End:</label>
              <Input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-auto"
              />
            </div>
          </div>

          {attendanceLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : attendanceData ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Present', value: attendanceData.totalPresent },
                          { name: 'Absent', value: attendanceData.totalAbsent },
                          { name: 'Late', value: attendanceData.totalLate },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {
                          [
                            { name: 'Present', value: attendanceData.totalPresent },
                            { name: 'Absent', value: attendanceData.totalAbsent },
                            { name: 'Late', value: attendanceData.totalLate },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))
                        }
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>By Department</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData.byDepartment}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="departmentName" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Legend />
                      <Bar dataKey="present" stackId="a" fill={COLORS[0]} name="Present" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="late" stackId="a" fill={COLORS[2]} name="Late" />
                      <Bar dataKey="absent" stackId="a" fill={COLORS[3]} name="Absent" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>No data available</div>
          )}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4 pt-4">
          <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <Select value={reportYear.toString()} onValueChange={(v) => setReportYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[reportYear - 1, reportYear, reportYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {leaveLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : leaveData ? (
             <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Applications by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Approved', value: leaveData.approved },
                          { name: 'Rejected', value: leaveData.rejected },
                          { name: 'Pending', value: leaveData.pending },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {
                          [
                            { name: 'Approved', value: leaveData.approved },
                            { name: 'Rejected', value: leaveData.rejected },
                            { name: 'Pending', value: leaveData.pending },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))
                        }
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leave by Type (Days)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveData.byType} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="leaveType" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} style={{textTransform: 'capitalize'}} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Bar dataKey="totalDays" fill={COLORS[0]} name="Total Days Taken" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>No data available</div>
          )}
        </TabsContent>

        {isSuperAdmin() && (
          <TabsContent value="payroll" className="space-y-4 pt-4">
             <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Period:</label>
                <Select value={reportMonth.toString()} onValueChange={(v) => setReportMonth(parseInt(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={reportYear.toString()} onValueChange={(v) => setReportYear(parseInt(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[reportYear - 1, reportYear, reportYear + 1].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {payrollLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : payrollData ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Base Salary', value: payrollData.totalBaseSalary },
                            { name: 'Bonuses', value: payrollData.totalBonuses },
                            { name: 'Deductions', value: payrollData.totalDeductions },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {
                            [
                              { name: 'Base Salary', value: payrollData.totalBaseSalary },
                              { name: 'Bonuses', value: payrollData.totalBonuses },
                              { name: 'Deductions', value: payrollData.totalDeductions },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))
                          }
                        </Pie>
                        <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Summary Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Total Net Salary</span>
                        <span className="font-bold font-mono text-xl">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payrollData.totalNetSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Employees Processed</span>
                        <span className="font-bold font-mono">{payrollData.employeeCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-muted-foreground">Approved Payslips</span>
                        <span className="font-bold font-mono text-green-500">{payrollData.approvedCount} / {payrollData.employeeCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div>No data available</div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
