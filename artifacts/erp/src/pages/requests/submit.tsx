import { useLocation } from "wouter";
import { useCreateRequest, getListRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText } from "lucide-react";

const submitRequestSchema = z.object({
  requestType: z.enum(["equipment", "software", "travel", "expense", "other"]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please provide detailed justification (min 10 chars)"),
});

export default function SubmitRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof submitRequestSchema>>({
    resolver: zodResolver(submitRequestSchema),
    defaultValues: {
      requestType: "equipment",
      title: "",
      description: "",
    },
  });

  const createMutation = useCreateRequest({
    mutation: {
      onSuccess: () => {
        toast({ title: "Request submitted successfully" });
        queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        setLocation("/requests");
      },
      onError: (error) => {
        toast({ title: "Failed to submit", description: error.data?.error, variant: "destructive" });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof submitRequestSchema>) => {
    createMutation.mutate({ data: values });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/requests")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Submit Request</h1>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Request Details
          </CardTitle>
          <CardDescription>Provide details for the equipment, software, or other resources you need.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="equipment">Hardware / Equipment</SelectItem>
                        <SelectItem value="software">Software / License</SelectItem>
                        <SelectItem value="travel">Travel Authorization</SelectItem>
                        <SelectItem value="expense">Expense Reimbursement</SelectItem>
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. New Monitor, Adobe License..." {...field} />
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
                    <FormLabel>Justification / Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Why do you need this? Include links or exact specifications if applicable." 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setLocation("/requests")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
