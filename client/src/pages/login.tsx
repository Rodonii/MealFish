import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: "Please enter username and password", variant: "destructive" });
      return;
    }
    
    try {
      await login(username, password);
      setLocation("/products");
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    } catch (error: any) {
      toast({ 
        title: "Login failed", 
        description: error.message || "Please try again.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-12 relative z-10">
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-xl shadow-primary/30 mb-6 transform -rotate-6">
              <QrCode className="w-8 h-8 transform rotate-6" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              Welcome to <span className="text-gradient">Nasukatsu</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Scan products, earn points, and unlock rewards.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground ml-1">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 px-5 rounded-xl border-2 bg-white focus-visible:ring-primary/20 focus-visible:border-primary text-base transition-all"
                disabled={isLoggingIn}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 px-5 rounded-xl border-2 bg-white focus-visible:ring-primary/20 focus-visible:border-primary text-base transition-all"
                disabled={isLoggingIn}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-14 rounded-xl text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Connecting..." : "Get Started"}
              {!isLoggingIn && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
