import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import AddEmployee from "@/pages/employees/new";
import EmployeeDetail from "@/pages/employees/[id]";
import EditEmployee from "@/pages/employees/edit";
import Departments from "@/pages/departments";
import AttendancePortal from "@/pages/attendance/portal";
import Attendance from "@/pages/attendance";
import Leave from "@/pages/leave";
import ApplyLeave from "@/pages/leave/apply";
import LeaveDetail from "@/pages/leave/[id]";
import Complaints from "@/pages/complaints";
import SubmitComplaint from "@/pages/complaints/submit";
import ComplaintDetail from "@/pages/complaints/[id]";
import Requests from "@/pages/requests";
import SubmitRequest from "@/pages/requests/submit";
import RequestDetail from "@/pages/requests/[id]";
import Payroll from "@/pages/payroll";
import AddPayroll from "@/pages/payroll/new";
import PayrollDetail from "@/pages/payroll/[id]";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/projects/[id]";
import Tasks from "@/pages/tasks";
import TaskDetail from "@/pages/tasks/[id]";
import Notifications from "@/pages/notifications";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import AuditLog from "@/pages/audit";
import Profile from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-primary font-mono text-sm tracking-widest uppercase">Initializing CoreHR...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/employees/new">{(params) => <ProtectedRoute component={AddEmployee} params={params} />}</Route>
      <Route path="/employees/:id/edit">{(params) => <ProtectedRoute component={EditEmployee} params={params} />}</Route>
      <Route path="/employees/:id">{(params) => <ProtectedRoute component={EmployeeDetail} params={params} />}</Route>
      <Route path="/employees">{(params) => <ProtectedRoute component={Employees} params={params} />}</Route>
      
      <Route path="/departments">{(params) => <ProtectedRoute component={Departments} params={params} />}</Route>
      
      <Route path="/attendance/portal">{(params) => <ProtectedRoute component={AttendancePortal} params={params} />}</Route>
      <Route path="/attendance">{(params) => <ProtectedRoute component={Attendance} params={params} />}</Route>
      
      <Route path="/leave/apply">{(params) => <ProtectedRoute component={ApplyLeave} params={params} />}</Route>
      <Route path="/leave/:id">{(params) => <ProtectedRoute component={LeaveDetail} params={params} />}</Route>
      <Route path="/leave">{(params) => <ProtectedRoute component={Leave} params={params} />}</Route>
      
      <Route path="/complaints/submit">{(params) => <ProtectedRoute component={SubmitComplaint} params={params} />}</Route>
      <Route path="/complaints/:id">{(params) => <ProtectedRoute component={ComplaintDetail} params={params} />}</Route>
      <Route path="/complaints">{(params) => <ProtectedRoute component={Complaints} params={params} />}</Route>
      
      <Route path="/requests/submit">{(params) => <ProtectedRoute component={SubmitRequest} params={params} />}</Route>
      <Route path="/requests/:id">{(params) => <ProtectedRoute component={RequestDetail} params={params} />}</Route>
      <Route path="/requests">{(params) => <ProtectedRoute component={Requests} params={params} />}</Route>
      
      <Route path="/payroll/new">{(params) => <ProtectedRoute component={AddPayroll} params={params} />}</Route>
      <Route path="/payroll/:id">{(params) => <ProtectedRoute component={PayrollDetail} params={params} />}</Route>
      <Route path="/payroll">{(params) => <ProtectedRoute component={Payroll} params={params} />}</Route>
      
      <Route path="/projects/:id">{(params) => <ProtectedRoute component={ProjectDetail} params={params} />}</Route>
      <Route path="/projects">{(params) => <ProtectedRoute component={Projects} params={params} />}</Route>
      
      <Route path="/tasks/:id">{(params) => <ProtectedRoute component={TaskDetail} params={params} />}</Route>
      <Route path="/tasks">{(params) => <ProtectedRoute component={Tasks} params={params} />}</Route>
      
      <Route path="/notifications">{(params) => <ProtectedRoute component={Notifications} params={params} />}</Route>
      <Route path="/reports">{(params) => <ProtectedRoute component={Reports} params={params} />}</Route>
      <Route path="/settings">{(params) => <ProtectedRoute component={Settings} params={params} />}</Route>
      <Route path="/audit">{(params) => <ProtectedRoute component={AuditLog} params={params} />}</Route>
      <Route path="/profile">{(params) => <ProtectedRoute component={Profile} params={params} />}</Route>
      
      <Route path="/">{(params) => <ProtectedRoute component={Dashboard} params={params} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
