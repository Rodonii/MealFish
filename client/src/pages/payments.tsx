import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Inbox,
  Loader2,
  ShieldAlert,
  Wallet,
  Hash,
  User as UserIcon,
  Package,
  Plus,
  MessageSquare,
} from "lucide-react";
import type { PaymentRequest } from "@shared/schema";

function parseAddOns(jsonString: string | null | undefined): Array<{ name: string; price: number }> {
  try {
    const parsed = JSON.parse(jsonString || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a: any) => a && typeof a.name === "string" && typeof a.price === "number");
  } catch {
    return [];
  }
}

interface PendingItem {
  request: PaymentRequest;
  username: string;
  productName: string;
}

const PENDING_KEY = "/api/payments/pending";

function timeSince(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<PendingItem[]>({
    queryKey: [PENDING_KEY],
    enabled: !!user?.isAdmin,
    refetchInterval: 3000,
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.payments.confirm.path, { id });
      await apiRequest("POST", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PENDING_KEY] });
      toast({ title: "Payment confirmed", description: "Customer has been credited their points." });
    },
    onError: (err: any) => {
      toast({ title: "Could not confirm", description: err?.message || "Try again.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.payments.reject.path, { id });
      await apiRequest("POST", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PENDING_KEY] });
      toast({ title: "Payment rejected", description: "The request was marked as rejected." });
    },
    onError: (err: any) => {
      toast({ title: "Could not reject", description: err?.message || "Try again.", variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 w-full text-center py-20">
        <ShieldAlert className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admins only</h1>
        <p className="text-muted-foreground mb-8">The payments inbox is only available to the admin account.</p>
        <Link href="/products">
          <Button data-testid="button-back-products">Back to products</Button>
        </Link>
      </div>
    );
  }

  const pending = data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
      <Link
        href="/products"
        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group"
        data-testid="link-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Payments inbox</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Confirm a payment after you see the money in your e-wallet. Customer's points are credited immediately.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20" data-testid="badge-pending-count">
          <Inbox className="w-4 h-4" />
          {pending.length} pending
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-12 text-center" data-testid="empty-pending">
          <Inbox className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">No pending payments</h2>
          <p className="text-muted-foreground">When customers tap "Show payment QR" on a product, their request will land here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => {
            const id = item.request.id;
            const isBusy = (confirmMutation.isPending && confirmMutation.variables === id)
              || (rejectMutation.isPending && rejectMutation.variables === id);
            const addOns = parseAddOns((item.request as any).selectedAddOns);
            return (
              <div
                key={id}
                className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6"
                data-testid={`card-payment-${id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1">
                      <Hash className="w-3 h-3" /> Reference
                    </div>
                    <div className="text-2xl font-mono font-bold text-foreground tracking-wider" data-testid={`text-reference-${id}`}>
                      {item.request.referenceCode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-end gap-1.5 mb-1">
                      <Wallet className="w-3 h-3" /> Amount
                    </div>
                    <div className="text-2xl font-display font-bold text-primary" data-testid={`text-amount-${id}`}>
                      {formatPrice(item.request.amount)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium" data-testid={`text-customer-${id}`}>{item.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium" data-testid={`text-product-${id}`}>{item.productName}</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground sm:col-span-2">
                    Started {item.request.createdAt ? timeSince(item.request.createdAt) : "just now"} · Earns {item.request.pointsToEarn} pts
                  </div>
                </div>

                {addOns.length > 0 && (
                  <div className="mb-5 rounded-2xl bg-secondary/40 border border-border/60 px-4 py-3" data-testid={`addons-${id}`}>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                      <Plus className="w-3 h-3" /> Add-ons ordered
                    </div>
                    <div className="space-y-1">
                      {addOns.map((a, idx) => (
                        <div key={`${a.name}-${idx}`} className="flex justify-between text-sm" data-testid={`addon-line-${id}-${idx}`}>
                          <span className="text-foreground truncate pr-2">{a.name}</span>
                          <span className="text-muted-foreground font-medium">{formatPrice(a.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(item.request as any).notes && (
                  <div className="mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-4 py-3" data-testid={`notes-${id}`}>
                    <div className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3 h-3" /> Customer notes
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{(item.request as any).notes}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => confirmMutation.mutate(id)}
                    disabled={isBusy}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg text-white"
                    data-testid={`button-confirm-${id}`}
                  >
                    {confirmMutation.isPending && confirmMutation.variables === id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...</>
                    ) : (
                      <><CheckCircle2 className="w-5 h-5 mr-2" /> I received the payment</>
                    )}
                  </Button>
                  <Button
                    onClick={() => rejectMutation.mutate(id)}
                    disabled={isBusy}
                    variant="outline"
                    className="sm:w-44 h-12 border-destructive/40 text-destructive hover:bg-destructive/10"
                    data-testid={`button-reject-${id}`}
                  >
                    {rejectMutation.isPending && rejectMutation.variables === id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting...</>
                    ) : (
                      <><XCircle className="w-5 h-5 mr-2" /> Reject</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
