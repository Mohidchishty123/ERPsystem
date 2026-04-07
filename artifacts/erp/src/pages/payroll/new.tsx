import { useAuth } from "@/hooks/use-auth";
import { useCreatePayroll, useListUsers, getListPayrollQueryKey, getGetPayrollSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign } from "lucide-react";

const createPayrollSchema = z.object({
  userId: z.coerce.number().min(1, "Employee is required"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  baseSalary: z.coerce.number().min(0),
  allowances: z.coerce.number().min(0).default(0),
  bonuses: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
});

export default function AddPayroll() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  
  const { data: users } = useListUsers({ status: "active" }, { query: { enabled: isAdmin() } });

  const form = useForm<z.infer<typeof createPayrollSchema>>({
    resolver: zodResolver(createPayrollSchema),
    defaultValues: {
      userId: 0,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      baseSalary: 0,
      allowances: 0,
      bonuses: 0,
      deductions: 0,
    },
  });

  const base = form.watch("baseSalary") || 0;
  const allowances = form.watch("allowances") || 0;
  const bonuses = form.watch("bonuses") || 0;
  const deductions = form.watch("deductions") || 0;
  const netSalary = base + allowances + bonuses - deductions;

  const createMutation = useCreatePayroll({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Payroll record created successfully" });
        queryClient.invalidateQueries({ queryKey: getListPayrollQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPayrollSummaryQueryKey({ month: data.month, year: data.year }) });
        setLocation(`/payroll/${data.id}`);
      },
      onError: (error) => {
        toast({ title: "Failed to create", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof createPayrollSchema>) => {
    createMutation.mutate({ data: values });
  };

  if (!isAdmin()) return <div>Unauthorized</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/payroll")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Process Payroll</h1>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payroll Entry
          </CardTitle>
          <CardDescription>Create a draft payslip for an employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Employee</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(parseInt(v))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} - {u.departmentName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(parseInt(v))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="baseSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Salary</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowances"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowances</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bonuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonuses / Commissions</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deductions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-destructive">Deductions (Taxes, etc)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-destructive" />
                          <Input type="number" className="pl-9 border-destructive/30" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center mt-6">
                <div>
                  <p className="text-sm font-medium text-primary">Calculated Net Salary</p>
                  <p className="text-xs text-muted-foreground">Will be saved as draft</p>
                </div>
                <div className="text-3xl font-bold font-mono text-primary">
                  ${netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setLocation("/payroll")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Save Draft"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
