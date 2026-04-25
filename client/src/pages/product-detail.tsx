import React from "react";
import { useParams, useLocation } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { usePurchase } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  QrCode as QrIcon,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Wallet,
  Hash,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentRequest } from "@shared/schema";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, updatePoints } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [paymentRequestId, setPaymentRequestId] = React.useState<number | null>(null);
  const [referenceCode, setReferenceCode] = React.useState<string>("");
  const [resolved, setResolved] = React.useState(false);

  const { data: product, isLoading: productLoading } = useProduct(Number(id));
  const { data: settings } = useQuery<{ logoUrl: string | null; paymentQrUrl: string | null }>({
    queryKey: [api.settings.get.path],
  });
  const purchaseMutation = usePurchase();

  // Poll the payment request until the owner confirms or rejects it
  const { data: pollData } = useQuery<{ request: PaymentRequest; newPointsTotal: number | null }>({
    queryKey: ["/api/payments/status", paymentRequestId],
    enabled: paymentRequestId != null && !resolved,
    refetchInterval: paymentRequestId != null && !resolved ? 2500 : false,
  });

  const startPaymentMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("POST", api.payments.create.path, { productId });
      return (await res.json()) as PaymentRequest;
    },
    onSuccess: (req) => {
      setPaymentRequestId(req.id);
      setReferenceCode(req.referenceCode);
      setResolved(false);
    },
    onError: (err: any) => {
      toast({ title: "Could not start payment", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  // React to status changes from polling
  React.useEffect(() => {
    if (!pollData || resolved) return;
    const status = pollData.request.status;

    if (status === "confirmed") {
      setResolved(true);
      if (pollData.newPointsTotal != null) {
        updatePoints(pollData.newPointsTotal);
      }
      toast({
        title: "Payment Confirmed!",
        description: `You earned ${pollData.request.pointsToEarn} points.`,
        action: <CheckCircle2 className="w-10 h-10 text-green-500" />,
      });
      setTimeout(() => setLocation("/history"), 1800);
    } else if (status === "rejected") {
      setResolved(true);
      toast({
        title: "Payment rejected",
        description: "The owner did not see your payment. You can start a new one.",
        variant: "destructive",
      });
    }
  }, [pollData, resolved, updatePoints, toast, setLocation]);

  // Reset state when product changes
  React.useEffect(() => {
    setPaymentRequestId(null);
    setReferenceCode("");
    setResolved(false);
  }, [id]);

  React.useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(cooldownRemaining - 1), 1000);
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

  // Demo path (no payment QR uploaded by admin)
  const handleDemoPurchase = async () => {
    if (!user || isProcessing || cooldownRemaining > 0) return;
    setIsProcessing(true);
    setCooldownRemaining(5);
    try {
      const result = await purchaseMutation.mutateAsync({ userId: user.id, productId: product.id });
      updatePoints(result.newPointsTotal);
      toast({
        title: "Purchase Successful!",
        description: `You earned ${result.transaction.pointsEarned} points.`,
        action: <CheckCircle2 className="w-10 h-10 text-green-500" />,
      });
      setTimeout(() => setLocation("/history"), 1500);
    } catch (error) {
      toast({ title: "Purchase Failed", description: "There was an error processing your simulated purchase.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartPayment = () => {
    if (!user) return;
    queryClient.removeQueries({ queryKey: ["/api/payments/status"] });
    startPaymentMutation.mutate(product.id);
  };

  const handleStartOver = () => {
    setPaymentRequestId(null);
    setReferenceCode("");
    setResolved(false);
  };

  const parseJsonSafe = (jsonString: string, fallback: any = []) => {
    try { return JSON.parse(jsonString); } catch { return fallback; }
  };

  const ingredients = parseJsonSafe((product as any).ingredients || "", []);
  const nutrition = parseJsonSafe((product as any).nutrition || "", {});

  const pointsToEarn = Math.floor(product.price / 100) * 5;
  const scanUrl = `${window.location.origin}/products/${product.id}`;
  const paymentQrUrl = settings?.paymentQrUrl || "";
  const status = pollData?.request.status ?? null;
  const isPaymentActive = paymentRequestId != null;
  const isConfirmed = status === "confirmed";
  const isRejected = status === "rejected";
  // Show the waiting screen as soon as the request exists, even before
  // the first status poll has returned. Only hide it once we know it's resolved.
  const isWaiting = isPaymentActive && !isConfirmed && !isRejected;

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
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full">{formatPrice(product.price)}</span>
                <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-bold rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Earn {pointsToEarn} pts
                </span>
              </div>

              <h1 className="text-4xl font-display font-bold text-foreground mb-4">{product.name}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">{product.description}</p>

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
                <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-500" /> Secure transaction</div>
                <div className="flex items-center gap-2"><QrIcon className="w-5 h-5 text-blue-500" /> Verified by owner</div>
              </div>
            </motion.div>
          </div>

          {/* Right: Payment / QR */}
          <div className="p-8 lg:p-12 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.2 }}
              className="w-full max-w-sm mx-auto flex flex-col items-center z-10"
            >
              <AnimatePresence mode="wait">
                {/* No payment QR uploaded — fall back to demo flow */}
                {!paymentQrUrl && (
                  <motion.div
                    key="demo"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-2">Scan to Purchase</h3>
                      <p className="text-muted-foreground">Demo mode — no e-wallet QR uploaded yet</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-border/50 mb-8 w-64 h-64 flex items-center justify-center dark:bg-white">
                      <QRCode value={scanUrl} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                    </div>
                    <Button
                      onClick={handleDemoPurchase}
                      disabled={purchaseMutation.isPending || isProcessing || cooldownRemaining > 0}
                      className="w-full h-16 text-lg rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1"
                      data-testid="button-demo-purchase"
                    >
                      {purchaseMutation.isPending ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                      ) : cooldownRemaining > 0 ? (
                        <><Clock className="w-5 h-5 mr-2" /> Wait {cooldownRemaining}s</>
                      ) : (
                        <><QrIcon className="w-6 h-6 mr-2" /> Simulate Scan & Purchase</>
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Payment QR available, user hasn't started yet */}
                {paymentQrUrl && !isPaymentActive && (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-2">Pay with E-Wallet</h3>
                      <p className="text-muted-foreground">Tap below to start. The owner will confirm once your payment lands.</p>
                    </div>
                    <div className="w-full mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Wallet className="w-4 h-4 text-primary" /> Amount
                      </div>
                      <div className="text-2xl font-display font-bold text-primary">{formatPrice(product.price)}</div>
                    </div>
                    <Button
                      onClick={handleStartPayment}
                      disabled={startPaymentMutation.isPending}
                      className="w-full h-16 text-lg rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1"
                      data-testid="button-start-payment"
                    >
                      {startPaymentMutation.isPending ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
                      ) : (
                        <><QrIcon className="w-6 h-6 mr-2" /> Show payment QR</>
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Waiting for owner to confirm */}
                {paymentQrUrl && isWaiting && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-2">Scan & Pay</h3>
                      <p className="text-muted-foreground">Open your e-wallet, scan the QR, then send the exact amount.</p>
                    </div>

                    <div className="w-full mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between" data-testid="banner-amount">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Wallet className="w-4 h-4 text-primary" /> Amount to pay
                      </div>
                      <div className="text-2xl font-display font-bold text-primary" data-testid="text-amount">{formatPrice(product.price)}</div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-border/50 mb-4 w-64 h-64 flex items-center justify-center dark:bg-white">
                      <img src={paymentQrUrl} alt="Owner e-wallet QR" className="w-full h-full object-contain" data-testid="img-payment-qr" />
                    </div>

                    <div className="w-full mb-6 rounded-2xl border border-border bg-card px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Hash className="w-3 h-3" /> Reference
                      </div>
                      <div className="text-lg font-mono font-bold text-foreground tracking-wider" data-testid="text-reference">
                        {referenceCode}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-center gap-3 text-sm text-primary font-medium mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for owner to confirm your payment...
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Your points will load automatically once the owner sees the payment.
                    </p>

                    <Button
                      variant="ghost"
                      onClick={handleStartOver}
                      className="mt-4 text-muted-foreground"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                )}

                {/* Confirmed */}
                {isConfirmed && (
                  <motion.div
                    key="confirmed"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">Payment confirmed!</h3>
                    <p className="text-muted-foreground mb-6">You earned <span className="font-bold text-primary">{pollData?.request.pointsToEarn} pts</span>. Redirecting to history...</p>
                  </motion.div>
                )}

                {/* Rejected */}
                {isRejected && (
                  <motion.div
                    key="rejected"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20">
                      <XCircle className="w-12 h-12 text-destructive" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">Payment not received</h3>
                    <p className="text-muted-foreground mb-6">The owner didn't find your payment. Please try again.</p>
                    <Button onClick={handleStartOver} className="w-full h-12 rounded-2xl" data-testid="button-try-again">
                      Try again
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
