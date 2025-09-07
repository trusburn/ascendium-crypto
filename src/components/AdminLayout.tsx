import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  BarChart3, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  { 
    title: 'Overview', 
    url: '/admin', 
    icon: BarChart3,
    description: 'System statistics and overview'
  },
  { 
    title: 'Deposits', 
    url: '/admin/deposits', 
    icon: TrendingUp,
    description: 'Manage user deposits'
  },
  { 
    title: 'Withdrawals', 
    url: '/admin/withdrawals', 
    icon: TrendingDown,
    description: 'Process withdrawal requests'
  },
  { 
    title: 'Users', 
    url: '/admin/users', 
    icon: Users,
    description: 'User management and controls'
  },
  { 
    title: 'Content', 
    url: '/admin/content', 
    icon: Menu,
    description: 'Manage site content and branding'
  },
  { 
    title: 'Admin Management', 
    url: '/admin/management', 
    icon: Shield,
    description: 'Manage admin accounts'
  },
  { 
    title: 'Settings', 
    url: '/admin/settings', 
    icon: Settings,
    description: 'System settings and configuration'
  },
];

function AdminSidebar() {
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (url: string) => {
    if (url === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className={!open ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {open && <span className="font-semibold">Admin Panel</span>}
            </div>
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="h-4 w-4" />
                      {open && (
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* User info and logout at bottom */}
        <div className="mt-auto p-3 border-t">
          {open && (
            <div className="mb-3 text-xs text-muted-foreground">
              <div className="font-medium">Logged in as:</div>
              <div className="truncate">{user?.email}</div>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center px-4 gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="flex-1">
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}