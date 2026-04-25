import React from "react";
import { useParams, useLocation } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { usePurchase } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { Loader2, QrCode as QrIcon, ArrowLeft, CheckCircle2, ShieldCheck, Zap, Info, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, updatePoints } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  
  const { data: product, isLoading: productLoading } = useProduct(Number(id));
  const { data: settings } = useQuery<{ logoUrl: string | null; paymentQrUrl: string | null }>({
    queryKey: [api.settings.get.path],
  });
  const purchaseMutation = usePurchase();

  React.useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  if (productLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <h2 className="text-2xl font-bold text-foreground">Product not found</h2>
        <Button className="mt-4" onClick={() => setLocation("/products")}>Back to Products</Button>
      </div>
    );
  }

  const handlePurchase = async () => {
    if (!user || isProcessing || cooldownRemaining > 0) return;
    
    setIsProcessing(true);
    setCooldownRemaining(5);
    
    try {
      const result = await purchaseMutation.mutateAsync({
        userId: user.id,
        productId: product.id,
      });
      
      updatePoints(result.newPointsTotal);
      
      toast({
        title: "Purchase Successful!",
        description: `You earned ${result.transaction.pointsEarned} points.`,
        action: <CheckCircle2 className="w-10 h-10 text-green-500" />,
      });
      
      // Delay redirect slightly for the user to see the success state
      setTimeout(() => {
        setLocation("/history");
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "There was an error processing your simulated purchase.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseJsonSafe = (jsonString: string, fallback: any = []) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  };

  const ingredients = parseJsonSafe((product as any).ingredients || "", []);
  const nutrition = parseJsonSafe((product as any).nutrition || "", {});

  const pointsToEarn = Math.floor(product.price / 100) * 5;
  const scanUrl = `${window.location.origin}/products/${product.id}`;
  const paymentQrUrl = settings?.paymentQrUrl || "";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Menu
      </Link>

      <div className="bg-card rounded-[2.5rem] shadow-xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Left: Product Details */}
          <div className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-border/60 flex flex-col">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="aspect-[4/3] rounded-3xl overflow-hidden bg-secondary mb-8 relative"
            >
              <img 
                src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&h=750&fit=crop"} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex-1"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full">
                  {formatPrice(product.price)}
                </span>
                <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-bold rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Earn {pointsToEarn} pts
                </span>
              </div>
              
              <h1 className="text-4xl font-display font-bold text-foreground mb-4">
                {product.name}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Ingredients Section */}
              {ingredients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mt-6 p-4 bg-secondary/40 rounded-2xl border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-foreground">Ingredients & Details</h4>
                  </div>
                  <ul className="space-y-2">
                    {ingredients.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Nutrition Section */}
              {Object.keys(nutrition).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="mt-4 p-4 bg-accent/10 rounded-2xl border border-accent/20"
                >
                  <h4 className="font-bold text-foreground mb-3">Specifications</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(nutrition).map(([key, value]: [string, any]) => (
                      <div key={key} className="text-sm">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <p className="font-semibold text-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground font-medium border-t pt-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-500" /> Secure transaction
                </div>
                <div className="flex items-center gap-2">
                  <QrIcon className="w-5 h-5 text-blue-500" /> Instant verification
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: QR Code & Action */}
          <div className="p-8 lg:p-12 bg-slate-50/50 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.2 }}
              className="w-full max-w-sm mx-auto flex flex-col items-center z-10"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                  {paymentQrUrl ? "Scan to Pay" : "Scan to Purchase"}
                </h3>
                <p className="text-muted-foreground">
                  {paymentQrUrl
                    ? "Open your e-wallet (GCash / Maya) and scan this QR"
                    : "Point your camera at the QR code below"}
                </p>
              </div>

              {/* Amount-to-pay banner */}
              <div className="w-full mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between" data-testid="banner-amount">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="w-4 h-4 text-primary" />
                  Amount to pay
                </div>
                <div className="text-2xl font-display font-bold text-primary" data-testid="text-amount">
                  {formatPrice(product.price)}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border border-border/50 mb-8 w-64 h-64 flex items-center justify-center relative group dark:bg-white">
                {paymentQrUrl ? (
                  <img
                    src={paymentQrUrl}
                    alt="Owner e-wallet QR"
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    data-testid="img-payment-qr"
                  />
                ) : (
                  <QRCode
                    value={scanUrl}
                    size={200}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                )}

              </div>

              {paymentQrUrl ? (
                <p className="text-xs text-muted-foreground text-center mb-6">
                  After paying the exact amount in your e-wallet, tap the button below to confirm and earn your points.
                </p>
              ) : (
                <div className="w-full relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-50 dark:bg-slate-900 text-muted-foreground font-medium">Or for this demo</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending || isProcessing || cooldownRemaining > 0}
                className="w-full h-16 text-lg rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1"
                data-testid="button-confirm-purchase"
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : cooldownRemaining > 0 ? (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Wait {cooldownRemaining}s
                  </>
                ) : paymentQrUrl ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                    I've Paid — Confirm Purchase
                  </>
                ) : (
                  <>
                    <QrIcon className="w-6 h-6 mr-2" />
                    Simulate Scan & Purchase
                  </>
                )}
              </Button>
            </motion.div>
          </div>
          
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(256px); }
          90% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
