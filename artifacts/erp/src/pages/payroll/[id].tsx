import { useAuth } from "@/hooks/use-auth";
import { useGetPayroll, useApprovePayroll, getListPayrollQueryKey, getGetPayrollQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Clock, DollarSign, Download, Printer } from "lucide-react";

export default function PayrollDetail() {
  const { id } = useParams();
  const payrollId = parseInt(id || "0");
  const { isSuperAdmin, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: record, isLoading } = useGetPayroll(payrollId);

  const approveMutation = useApprovePayroll({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payroll approved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetPayrollQueryKey(payrollId) });
        queryClient.invalidateQueries({ queryKey: getListPayrollQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Approval failed", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-4 h-4 mr-1" /> Draft</Badge>;
      case "approved": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><CheckCircle2 className="w-4 h-4 mr-1" /> Approved</Badge>;
      case "paid": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><DollarSign className="w-4 h-4 mr-1" /> Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!record) return <div>Not found</div>;

  const monthName = new Date(0, record.month - 1).toLocaleString('en-US', { month: 'long' });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/payroll")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Payslip Details</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {isSuperAdmin() && record.status === "draft" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-500">Action Required</p>
              <p className="text-sm text-yellow-500/80">This payroll record is in draft status and requires super admin approval.</p>
            </div>
            <Button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => approveMutation.mutate({ id: record.id })}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {approveMutation.isPending ? "Approving..." : "Approve Payroll"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-lg">
        <CardHeader className="bg-muted/20 border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl text-primary font-mono tracking-tight uppercase">CoreHR</CardTitle>
            <CardDescription>Payslip for {monthName} {record.year}</CardDescription>
          </div>
          <div className="text-right">
            {getStatusBadge(record.status)}
            <p className="text-xs text-muted-foreground mt-2 font-mono">Ref: PR-{record.year}{record.month.toString().padStart(2,'0')}-{record.id.toString().padStart(4,'0')}</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="p-6 grid grid-cols-2 gap-8 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Employee Details</p>
              <p className="font-bold text-lg">{record.userFullName}</p>
              <p className="text-sm text-muted-foreground">{record.departmentName}</p>
            </div>
            <div className="text-right md:text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Payment Period</p>
              <p className="font-medium text-sm">{monthName} 1 - {new Date(record.year, record.month, 0).getDate()}, {record.year}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <h3 className="font-bold mb-4 flex items-center text-green-500">
                <DollarSign className="w-4 h-4 mr-1" />
                Earnings
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span>{formatCurrency(record.baseSalary)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Allowances</span>
                  <span>{formatCurrency(record.allowances)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bonuses / Commission</span>
                  <span>{formatCurrency(record.bonuses)}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center font-bold text-sm font-mono">
                <span>Gross Earnings</span>
                <span>{formatCurrency(record.baseSalary + record.allowances + record.bonuses)}</span>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-bold mb-4 flex items-center text-destructive">
                <DollarSign className="w-4 h-4 mr-1" />
                Deductions
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tax & Deductions</span>
                  <span className="text-destructive">-{formatCurrency(record.deductions)}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center font-bold text-sm font-mono text-destructive">
                <span>Total Deductions</span>
                <span>{formatCurrency(record.deductions)}</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-6 border-t border-border flex flex-col items-center justify-center space-y-2">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Net Salary</p>
            <p className="text-5xl font-bold font-mono text-primary tracking-tighter">
              {formatCurrency(record.netSalary)}
            </p>
          </div>
        </CardContent>
        
        {record.approvedBy && (
          <div className="bg-muted/30 p-4 border-t border-border text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Approved by {record.approvedByName}
          </div>
        )}
      </Card>
    </div>
  );
}
