"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FolderOpen, Users, Cpu, Settings, LogOut, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AES";

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderOpen, exact: false },
  { href: "/templates", label: "Templates", icon: LayoutDashboard, exact: true },
  { href: "/settings/models", label: "Models", icon: Cpu, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
];

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-[#004176] dark:text-white">{APP_NAME}</span>
          <button className="md:hidden" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <Separator />

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : (pathname === href || (href !== "/" && pathname.startsWith(href)));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#004176] text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/settings/users"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/settings/users")
                  ? "bg-[#004176] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
          )}
        </nav>

        <Separator />

        {/* User footer */}
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#004176] text-white text-xs">
              {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </AuthProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
