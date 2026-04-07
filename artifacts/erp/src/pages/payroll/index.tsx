import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListPayroll, useGetPayrollSummary, useListDepartments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, CheckCircle2, Clock, Building } from "lucide-react";

export default function Payroll() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  
  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  
  const { data: departments } = useListDepartments({
    query: { enabled: isSuperAdmin() || isAdmin() }
  });

  const { data: summary, isLoading: summaryLoading } = useGetPayrollSummary(
    { month, year },
    { query: { enabled: isSuperAdmin() } }
  );

  const { data: records, isLoading } = useListPayroll({
    userId: (!isSuperAdmin() && !isAdmin()) ? user?.id : undefined,
    departmentId: departmentId || undefined,
    month,
    year
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      case "approved": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "paid": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><DollarSign className="w-3 h-3 mr-1" /> Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
        {isAdmin() && (
          <Link href="/payroll/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Process Payroll
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-lg border border-border">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
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
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[year - 1, year, year + 1].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {(isSuperAdmin() || isAdmin()) && (
          <Select
            value={departmentId?.toString() || "all"}
            onValueChange={(val) => setDepartmentId(val === "all" ? null : parseInt(val))}
          >
            <SelectTrigger className="w-[180px]">
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

      {isSuperAdmin() && summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summary.map(dept => (
            <Card key={dept.departmentId} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {dept.departmentName}
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(dept.totalNetSalary)}</div>
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>{dept.employeeCount} Employees</span>
                  <span className={dept.pendingCount > 0 ? "text-yellow-500" : "text-green-500"}>
                    {dept.pendingCount} Pending
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {isAdmin() ? "Employee payslips for selected period" : "Your payslip history"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin() && <TableHead>Employee</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="group">
                    {isAdmin() && (
                      <TableCell>
                        <div className="font-medium">{r.userFullName}</div>
                        <div className="text-xs text-muted-foreground">{r.departmentName}</div>
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {new Date(0, r.month - 1).toLocaleString('en-US', { month: 'short' })} {r.year}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(r.baseSalary + r.allowances + r.bonuses)}
                    </TableCell>
                    <TableCell className="text-right font-medium font-mono text-primary">
                      {formatCurrency(r.netSalary)}
                    </TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/payroll/${r.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View Payslip
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <DollarSign className="h-10 w-10 mb-3 opacity-20" />
              <p>No payroll records found for this period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
