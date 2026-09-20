import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Award, QrCode, History, LogOut, Package, Sun, Moon, Image as ImageIcon, Inbox, Ticket, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const { data: settings } = useQuery<{ logoUrl: string | null }>({
    queryKey: [api.settings.get.path],
    enabled: !!user,
  });

  if (!user) return <>{children}</>;

  const navItems = [
    { href: "/products", label: "Products", icon: Package },
    { href: "/history", label: "History", icon: History },
    { href: "/rewards", label: "Rewards", icon: Award },
    ...(user.isAdmin
      ? [
          { href: "/payments", label: "Payments", icon: Inbox },
          { href: "/admin/tickets", label: "Tickets", icon: Ticket },
          { href: "/admin/chat", label: "Chat", icon: MessageCircle },
          { href: "/branding", label: "Branding", icon: ImageIcon },
        ]
      : []),
  ];

  const logoUrl = settings?.logoUrl;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950">
      <header className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-700/30 glass-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap sm:py-0 md:h-20">
            {/* Logo */}
            <Link href="/products" className="flex min-w-0 shrink-0 items-center gap-2 group">
              {logoUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform duration-300 border border-border">
                  <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover" data-testid="img-store-logo" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-300">
                  <QrCode className="w-5 h-5" />
                </div>
              )}
              <span className="whitespace-nowrap font-display font-bold text-xl tracking-tight text-foreground">
                Meal'<span className="text-primary">Fish</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    location === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Profile & Points */}
            <div className="basis-full ml-auto flex w-full shrink-0 items-center justify-end gap-2 border-t border-border/60 pt-2 sm:basis-auto sm:w-auto sm:gap-4 sm:border-t-0 sm:pt-0">
              <Link href="/rewards">
                <motion.div
                  key={user.points}
                  initial={{ scale: 1.2, color: "var(--accent)" }}
                  animate={{ scale: 1, color: "inherit" }}
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-accent-foreground shadow-sm cursor-pointer transition-all duration-200 hover:bg-accent/20 hover:shadow-md hover:scale-105"
                  data-testid="link-points-badge"
                  title="View rewards"
                >
                  <Award className="h-4 w-4 text-accent" />
                  <span className="whitespace-nowrap text-sm font-bold text-accent">{user.points} pts</span>
                </motion.div>
              </Link>

              <div className="flex min-w-0 items-center gap-1 border-l pl-2 sm:gap-3 sm:pl-4">
                <span
                  className="min-w-0 max-w-[7rem] truncate text-sm font-bold text-foreground dark:text-foreground sm:max-w-none"
                  data-testid="text-username"
                  title={user.username}
                >
                  {user.username}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9 shrink-0 hover:bg-primary/10 hover:text-primary"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  data-testid="button-toggle-theme"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  data-testid="button-logout"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Mobile Navigation Bar (Bottom) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-slate-700/30 dark:border-slate-700/30 border-b-0 pb-safe"
        aria-label="Mobile navigation"
      >
        <div className="overflow-x-auto overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full items-center justify-start gap-2 px-3 h-16">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex shrink-0 snap-start flex-col items-center justify-center w-[4.75rem] min-w-[4.75rem] h-full gap-1 transition-colors ${
                location === item.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={toggleTheme}
            className="flex shrink-0 snap-start flex-col items-center justify-center w-[4.75rem] min-w-[4.75rem] h-full gap-1 text-muted-foreground hover:text-primary transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="text-[10px] font-medium">Theme</span>
          </button>
          <button 
            onClick={logout}
            className="flex shrink-0 snap-start flex-col items-center justify-center w-[4.75rem] min-w-[4.75rem] h-full gap-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
          </div>
        </div>
      </div>
      <main className="flex-1 flex flex-col pt-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
