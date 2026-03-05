import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Award, QrCode, History, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const navItems = [
    { href: "/products", label: "Products", icon: Package },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="sticky top-0 z-50 w-full border-b border-white/20 glass-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/products" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-300">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-foreground">
                Scan<span className="text-primary">w</span>
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
            <div className="flex items-center gap-4">
              <motion.div 
                key={user.points}
                initial={{ scale: 1.2, color: "var(--accent)" }}
                animate={{ scale: 1, color: "inherit" }}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent-foreground rounded-full border border-accent/20 shadow-sm"
              >
                <Award className="w-4 h-4 text-accent" />
                <span className="font-bold text-accent">{user.points} pts</span>
              </motion.div>
              
              <div className="hidden sm:flex items-center gap-3 pl-4 border-l">
                <span className="text-sm font-medium text-muted-foreground">
                  {user.username}
                </span>
                <Button variant="ghost" size="icon" onClick={logout} className="hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Mobile Navigation Bar (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-b-0 pb-safe">
        <div className="flex justify-around items-center h-16 px-4">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                location === item.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={logout}
            className="flex flex-col items-center justify-center w-16 h-full gap-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>
      <main className="flex-1 flex flex-col pt-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
