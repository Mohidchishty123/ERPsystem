import { useAuth } from "@/hooks/use-auth";
import { useCreateComplaint, getListComplaintsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const submitComplaintSchema = z.object({
  category: z.enum(["workplace", "harassment", "facilities", "management", "other"]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide enough detail for HR to investigate (min 20 chars)"),
  isAnonymous: z.boolean().default(false),
});

export default function SubmitComplaint() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof submitComplaintSchema>>({
    resolver: zodResolver(submitComplaintSchema),
    defaultValues: {
      category: "workplace",
      title: "",
      description: "",
      isAnonymous: false,
    },
  });

  const isAnonymous = form.watch("isAnonymous");

  const createMutation = useCreateComplaint({
    mutation: {
      onSuccess: () => {
        toast({ title: "Complaint filed successfully", description: "HR has been notified." });
        queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
        setLocation("/complaints");
      },
      onError: (error) => {
        toast({ title: "Failed to submit", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof submitComplaintSchema>) => {
    createMutation.mutate({ data: values });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/complaints")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">File a Grievance</h1>
      </div>

      <Alert className="bg-destructive/10 text-destructive border-destructive/20">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Confidentiality Guarantee</AlertTitle>
        <AlertDescription>
          All complaints are handled with strict confidentiality by the HR department. You have the option to submit this anonymously.
        </AlertDescription>
      </Alert>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Complaint Details
          </CardTitle>
          <CardDescription>Please provide accurate and detailed information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">Submit Anonymously</FormLabel>
                      <FormDescription>
                        Your name will be hidden from HR and management.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isAnonymous && (
                <div className="flex gap-2 items-start text-xs text-muted-foreground p-3 bg-muted rounded-md border border-border">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <p>When submitting anonymously, HR will not be able to follow up with you directly for additional information, but you can track the status using the Case ID.</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="workplace">Workplace Environment</SelectItem>
                        <SelectItem value="harassment">Harassment / Discrimination</SelectItem>
                        <SelectItem value="management">Management / Leadership</SelectItem>
                        <SelectItem value="facilities">Facilities / Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief summary of the issue" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide as much detail as possible (dates, times, involved parties)..." 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setLocation("/complaints")}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit Grievance"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
