import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Bell,
  Users,
  Building,
  CalendarCheck,
  Clock,
  Plane,
  MessageSquare,
  FileText,
  CheckSquare,
  Briefcase,
  DollarSign,
  BarChart,
  Settings,
  Shield,
  LogOut,
  User,
} from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border py-4 px-6 flex items-center justify-center">
            <h2 className="text-xl font-bold tracking-tight text-primary uppercase">CoreHR</h2>
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"}>
                      <Link href="/">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/notifications"}>
                      <Link href="/notifications">
                        <Bell className="h-4 w-4 mr-2" />
                        <span>Notifications</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">People</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/employees"}>
                      <Link href="/employees">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Employees</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isAdmin() && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/departments"}>
                        <Link href="/departments">
                          <Building className="h-4 w-4 mr-2" />
                          <span>Departments</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">Time & Leave</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/attendance"}>
                      <Link href="/attendance">
                        <CalendarCheck className="h-4 w-4 mr-2" />
                        <span>Attendance</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/attendance/portal"}>
                      <Link href="/attendance/portal">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Attendance Portal</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/leave"}>
                      <Link href="/leave">
                        <Plane className="h-4 w-4 mr-2" />
                        <span>Leave</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">Workflow</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/complaints"}>
                      <Link href="/complaints">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <span>Complaints</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/requests"}>
                      <Link href="/requests">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Requests</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/tasks"}>
                      <Link href="/tasks">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        <span>Tasks</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/projects"}>
                      <Link href="/projects">
                        <Briefcase className="h-4 w-4 mr-2" />
                        <span>Projects</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">Finance</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/payroll"}>
                      <Link href="/payroll">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Payroll</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin() && (
              <SidebarGroup className="mt-6">
                <SidebarGroupLabel className="text-muted-foreground text-xs uppercase font-mono tracking-wider">Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/reports"}>
                        <Link href="/reports">
                          <BarChart className="h-4 w-4 mr-2" />
                          <span>Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isSuperAdmin() && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={location === "/settings"}>
                            <Link href="/settings">
                              <Settings className="h-4 w-4 mr-2" />
                              <span>Settings</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={location === "/audit"}>
                            <Link href="/audit">
                              <Shield className="h-4 w-4 mr-2" />
                              <span>Audit Log</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-auto p-2">
                  <Avatar className="h-8 w-8 mr-2 border border-border">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 truncate">
                    <span className="text-sm font-medium truncate w-full">{user.fullName}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{user.role.replace("_", " ")}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-14 border-b border-border flex items-center px-4 bg-background">
            <SidebarTrigger />
            <div className="ml-auto">
              <Link href="/attendance/portal">
                <Button variant="outline" size="sm" className="h-8">
                  <Clock className="h-4 w-4 mr-2" />
                  Clock In/Out
                </Button>
              </Link>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 relative">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
