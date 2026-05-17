import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Lock,
  Zap,
  CheckCircle2,
  Loader2,
  Award,
  ArrowLeft,
  Percent,
  Banknote,
  History,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import type { DiscountTicket, Redemption } from "@shared/schema";

interface MyRedemptionItem {
  redemption: Redemption & { redeemedAt: string };
  ticket: DiscountTicket;
}

function TicketCard({
  ticket,
  userPoints,
  onRedeem,
  isPending,
}: {
  ticket: DiscountTicket;
  userPoints: number;
  onRedeem: (ticket: DiscountTicket) => void;
  isPending: boolean;
}) {
  const locked = userPoints < ticket.pointsCost;
  const progress = Math.min(100, Math.round((userPoints / ticket.pointsCost) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-card rounded-3xl border overflow-hidden shadow-sm transition-shadow ${
        locked ? "border-border/50 opacity-80" : "border-primary/30 shadow-md"
      }`}
      data-testid={`ticket-card-${ticket.id}`}
    >
      {/* Punched-hole decorations */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full border-r border-border/40" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full border-l border-border/40" />

      {/* Dashed divider */}
      <div className="absolute left-6 right-6 top-1/2 border-t-2 border-dashed border-border/40 pointer-events-none" />

      {/* Top half */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-lg text-foreground line-clamp-1">{ticket.name}</h3>
            {ticket.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{ticket.description}</p>
            )}
          </div>
          <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-display font-bold ${
            ticket.discountType === "percent"
              ? "bg-primary/10 text-primary"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}>
            {ticket.discountType === "percent" ? (
              <><Percent className="w-4 h-4" /> {ticket.discountValue}% off</>
            ) : (
              <><Banknote className="w-4 h-4" /> ₱{(ticket.discountValue / 100).toFixed(0)} off</>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-muted-foreground bg-secondary/60 rounded-lg px-3 py-1.5 border border-dashed border-border w-fit">
          <Ticket className="w-3.5 h-3.5" /> {ticket.code}
        </div>
      </div>

      {/* Bottom half */}
      <div className="px-8 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="font-bold text-accent">{ticket.pointsCost} pts</span>
            <span className="text-muted-foreground">required</span>
          </div>
          {locked && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Need {ticket.pointsCost - userPoints} more pts
            </div>
          )}
        </div>

        {locked && (
          <div className="mb-3">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/50 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-muted-foreground mt-1">{progress}%</div>
          </div>
        )}

        <Button
          onClick={() => onRedeem(ticket)}
          disabled={locked || isPending}
          className={`w-full rounded-2xl h-11 font-semibold ${
            locked
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          }`}
          data-testid={`button-redeem-${ticket.id}`}
        >
          {locked ? (
            <><Lock className="w-4 h-4 mr-2" /> Locked — not enough points</>
          ) : isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redeeming...</>
          ) : (
            <><Ticket className="w-4 h-4 mr-2" /> Redeem this ticket</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function RedeemDialog({
  ticket,
  onConfirm,
  onCancel,
  isPending,
}: {
  ticket: DiscountTicket;
  onConfirm: (identifier: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [identifier, setIdentifier] = React.useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-sm p-7"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Redeem ticket</h3>
            <p className="text-sm text-muted-foreground">{ticket.name}</p>
          </div>
        </div>

        <div className="bg-secondary/40 rounded-2xl p-4 mb-5 border border-border/60">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1">Discount code</div>
          <div className="font-mono text-xl font-bold text-foreground tracking-widest">{ticket.code}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {ticket.discountType === "percent"
              ? `${ticket.discountValue}% off your next order`
              : `₱${(ticket.discountValue / 100).toFixed(0)} off your next order`}
          </div>
        </div>

        <div className="mb-5">
          <Label htmlFor="identifier" className="text-sm font-semibold mb-2 block">
            Your name / label
          </Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. Juan, Table 5, Order #12..."
            className="rounded-xl"
            data-testid="input-identifier"
            onKeyDown={(e) => e.key === "Enter" && identifier.trim() && onConfirm(identifier)}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            This helps the admin know who used this ticket.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-xl"
            data-testid="button-cancel-redeem"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(identifier)}
            disabled={!identifier.trim() || isPending}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white"
            data-testid="button-confirm-redeem"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Redeeming...</>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReceiptDialog({
  ticket,
  identifier,
  onClose,
}: {
  ticket: DiscountTicket;
  identifier: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const fullCode = `${ticket.code} — ${identifier}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-sm p-7 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="font-display font-bold text-2xl text-foreground mb-1">Ticket redeemed!</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Show the code below to the cashier when you order.
        </p>

        <div className="bg-secondary/50 rounded-2xl border border-dashed border-border p-5 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Your discount code</div>
          <div className="font-mono text-2xl font-bold text-foreground tracking-wider mb-1">{ticket.code}</div>
          <div className="text-sm text-muted-foreground">— {identifier}</div>
          <div className="mt-3 text-sm font-semibold text-primary">
            {ticket.discountType === "percent"
              ? `${ticket.discountValue}% off`
              : `₱${(ticket.discountValue / 100).toFixed(0)} off`}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto mb-6"
          data-testid="button-copy-code"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy code"}
        </button>

        <Button onClick={onClose} className="w-full rounded-2xl" data-testid="button-done">
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function Rewards() {
  const { user, updatePoints } = useAuth();
  const { toast } = useToast();
  const [redeemTarget, setRedeemTarget] = React.useState<DiscountTicket | null>(null);
  const [receipt, setReceipt] = React.useState<{ ticket: DiscountTicket; identifier: string } | null>(null);

  const { data: tickets = [], isLoading } = useQuery<DiscountTicket[]>({
    queryKey: [api.tickets.list.path],
    enabled: !!user,
  });

  const { data: myRedemptions = [] } = useQuery<MyRedemptionItem[]>({
    queryKey: [api.tickets.myRedemptions.path],
    enabled: !!user,
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ ticketId, identifier }: { ticketId: number; identifier: string }) => {
      const url = buildUrl(api.tickets.redeem.path, { id: ticketId });
      const res = await apiRequest("POST", url, { identifier });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Could not redeem");
      }
      return await res.json() as { redemption: Redemption; ticket: DiscountTicket; newPointsTotal: number };
    },
    onSuccess: (data) => {
      updatePoints(data.newPointsTotal);
      queryClient.invalidateQueries({ queryKey: [api.tickets.myRedemptions.path] });
      setReceipt({ ticket: data.ticket, identifier: data.redemption.identifier });
      setRedeemTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Could not redeem", description: err.message || "Try again.", variant: "destructive" });
    },
  });

  const handleConfirm = (identifier: string) => {
    if (!redeemTarget) return;
    redeemMutation.mutate({ ticketId: redeemTarget.id, identifier });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
        <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to products
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
              <Award className="w-9 h-9 text-accent" /> Rewards
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Spend your points on discount tickets and save on your next order.
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent border border-accent/20 font-bold text-lg shrink-0"
            data-testid="text-points-balance"
          >
            <Zap className="w-5 h-5" /> {user?.points ?? 0} pts
          </div>
        </div>

        {/* Mobile points chip */}
        <div className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent/10 border border-accent/20 mb-6 w-fit">
          <Zap className="w-4 h-4 text-accent" />
          <span className="font-bold text-accent">{user?.points ?? 0} pts available</span>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-12 text-center" data-testid="empty-tickets">
            <Ticket className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">No tickets yet</h2>
            <p className="text-muted-foreground">
              The admin hasn't created any discount tickets yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                userPoints={user?.points ?? 0}
                onRedeem={setRedeemTarget}
                isPending={redeemMutation.isPending && (redeemTarget?.id === ticket.id)}
              />
            ))}
          </div>
        )}

        {/* Redemption history */}
        {myRedemptions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" /> My redemptions
            </h2>
            <div className="space-y-3">
              {myRedemptions.map(({ redemption, ticket }) => (
                <div
                  key={redemption.id}
                  className="bg-card rounded-2xl border border-border px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                  data-testid={`my-redemption-${redemption.id}`}
                >
                  <div>
                    <div className="font-semibold text-foreground">{ticket.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{ticket.code} — {redemption.identifier}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-destructive/80">−{redemption.pointsSpent} pts</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      ticket.discountType === "percent"
                        ? "bg-primary/10 text-primary"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {ticket.discountType === "percent"
                        ? `${ticket.discountValue}% off`
                        : `₱${(ticket.discountValue / 100).toFixed(0)} off`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {redeemTarget && (
          <RedeemDialog
            ticket={redeemTarget}
            onConfirm={handleConfirm}
            onCancel={() => setRedeemTarget(null)}
            isPending={redeemMutation.isPending}
          />
        )}
        {receipt && (
          <ReceiptDialog
            ticket={receipt.ticket}
            identifier={receipt.identifier}
            onClose={() => setReceipt(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
