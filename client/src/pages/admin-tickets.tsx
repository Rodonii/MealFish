import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Ticket,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Check,
  X,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { format } from "date-fns";
import type { DiscountTicket, Redemption } from "@shared/schema";

interface RedemptionSummary {
  redemption: Redemption & { redeemedAt: string };
  username: string;
  ticketName: string;
  ticketCode: string;
}

function blankForm() {
  return {
    name: "",
    description: "",
    code: "",
    pointsCost: "",
    discountType: "percent" as "percent" | "flat",
    discountValue: "",
  };
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = React.useState(blankForm());
  const [open, setOpen] = React.useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const pointsCost = parseInt(form.pointsCost);
      const discountValue =
        form.discountType === "percent"
          ? parseInt(form.discountValue)
          : Math.round(parseFloat(form.discountValue) * 100);

      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.code.trim()) throw new Error("Code is required");
      if (isNaN(pointsCost) || pointsCost <= 0) throw new Error("Points cost must be a positive number");
      if (isNaN(discountValue) || discountValue <= 0) throw new Error("Discount value must be positive");
      if (form.discountType === "percent" && discountValue > 100) throw new Error("Percent discount cannot exceed 100");

      const res = await apiRequest("POST", api.tickets.create.path, {
        name: form.name.trim(),
        description: form.description.trim(),
        code: form.code.trim().toUpperCase(),
        pointsCost,
        discountType: form.discountType,
        discountValue,
        isActive: true,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Could not create ticket");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      toast({ title: "Ticket created", description: "Customers can now see and redeem it." });
      setForm(blankForm());
      setOpen(false);
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: "Could not create ticket", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden mb-6">
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid="button-toggle-create"
      >
        <span className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Create new ticket
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-6 pb-6 pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="t-name" className="text-sm font-semibold mb-1.5 block">Ticket name *</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. 20% Off Meal Deal"
                data-testid="input-ticket-name"
              />
            </div>
            <div>
              <Label htmlFor="t-code" className="text-sm font-semibold mb-1.5 block">
                Discount code * <span className="text-xs font-normal text-muted-foreground">(letters/numbers/-/_)</span>
              </Label>
              <Input
                id="t-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                placeholder="e.g. FISH20OFF"
                maxLength={24}
                className="font-mono"
                data-testid="input-ticket-code"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="t-desc" className="text-sm font-semibold mb-1.5 block">Description</Label>
            <Input
              id="t-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional — shown to customers"
              data-testid="input-ticket-desc"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="t-cost" className="text-sm font-semibold mb-1.5 block">Points cost *</Label>
              <Input
                id="t-cost"
                type="number"
                min="1"
                value={form.pointsCost}
                onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                placeholder="e.g. 500"
                data-testid="input-ticket-cost"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Discount type *</Label>
              <div className="flex gap-2">
                {(["percent", "flat"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, discountType: t })}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      form.discountType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                    data-testid={`button-type-${t}`}
                  >
                    {t === "percent" ? "Percent" : "Flat (₱)"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="t-value" className="text-sm font-semibold mb-1.5 block">
                {form.discountType === "percent" ? "Percent (1-100) *" : "Amount in PHP *"}
              </Label>
              <Input
                id="t-value"
                type="number"
                min="1"
                max={form.discountType === "percent" ? "100" : undefined}
                step={form.discountType === "flat" ? "0.01" : "1"}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "percent" ? "e.g. 20" : "e.g. 50"}
                data-testid="input-ticket-value"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="rounded-2xl px-8"
              data-testid="button-create-ticket"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Create ticket</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: DiscountTicket }) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [editCode, setEditCode] = React.useState(ticket.code);
  const [editName, setEditName] = React.useState(ticket.name);
  const [editCost, setEditCost] = React.useState(String(ticket.pointsCost));

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.tickets.update.path, { id: ticket.id });
      const res = await apiRequest("PATCH", url, { isActive: !ticket.isActive });
      if (!res.ok) throw new Error((await res.json()).message);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
    },
    onError: (err: any) => toast({ title: "Could not toggle", description: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cost = parseInt(editCost);
      if (isNaN(cost) || cost <= 0) throw new Error("Points cost must be positive");
      if (!editCode.trim()) throw new Error("Code is required");
      const url = buildUrl(api.tickets.update.path, { id: ticket.id });
      const res = await apiRequest("PATCH", url, {
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        pointsCost: cost,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      toast({ title: "Ticket updated" });
      setEditing(false);
    },
    onError: (err: any) => toast({ title: "Could not update", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.tickets.delete.path, { id: ticket.id });
      const res = await apiRequest("DELETE", url);
      if (!res.ok) throw new Error((await res.json()).message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      toast({ title: "Ticket deleted" });
    },
    onError: (err: any) => toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
  });

  return (
    <div
      className={`bg-card rounded-2xl border px-5 py-4 flex flex-wrap items-center gap-4 transition-opacity ${
        ticket.isActive ? "border-border" : "border-border/50 opacity-60"
      }`}
      data-testid={`ticket-row-${ticket.id}`}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm w-40"
              data-testid={`edit-name-${ticket.id}`}
            />
            <Input
              value={editCode}
              onChange={(e) => setEditCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              className="h-8 text-sm font-mono w-32"
              maxLength={24}
              data-testid={`edit-code-${ticket.id}`}
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                className="h-8 text-sm w-20"
                data-testid={`edit-cost-${ticket.id}`}
              />
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-semibold text-foreground">{ticket.name}</div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded border border-dashed border-border">
                {ticket.code}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-accent">{ticket.pointsCost} pts</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-primary font-semibold">
                {ticket.discountType === "percent"
                  ? `${ticket.discountValue}% off`
                  : `₱${(ticket.discountValue / 100).toFixed(0)} off`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="text-emerald-600 hover:bg-emerald-500/10 h-8 w-8"
              data-testid={`button-save-${ticket.id}`}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setEditing(false); setEditName(ticket.name); setEditCode(ticket.code); setEditCost(String(ticket.pointsCost)); }}
              className="h-8 w-8"
              data-testid={`button-cancel-edit-${ticket.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className="text-muted-foreground hover:text-primary transition-colors"
              title={ticket.isActive ? "Deactivate" : "Activate"}
              data-testid={`button-toggle-${ticket.id}`}
            >
              {toggleMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : ticket.isActive ? (
                <ToggleRight className="w-6 h-6 text-primary" />
              ) : (
                <ToggleLeft className="w-6 h-6" />
              )}
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              data-testid={`button-edit-${ticket.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              data-testid={`button-delete-${ticket.id}`}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminTickets() {
  const { user } = useAuth();

  const { data: tickets = [], isLoading } = useQuery<DiscountTicket[]>({
    queryKey: [api.tickets.list.path],
    enabled: !!user?.isAdmin,
  });

  const { data: redemptions = [], isLoading: redemptionsLoading } = useQuery<RedemptionSummary[]>({
    queryKey: [api.tickets.listRedemptions.path],
    enabled: !!user?.isAdmin,
    refetchInterval: 10000,
  });

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 w-full text-center py-20">
        <ShieldAlert className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admins only</h1>
        <Link href="/products">
          <Button>Back to products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Ticket className="w-8 h-8 text-primary" /> Discount Tickets
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Create and manage the discount tickets customers can redeem with their points.
        </p>
      </div>

      <CreateForm onCreated={() => {}} />

      {/* Ticket list */}
      <h2 className="text-xl font-display font-bold text-foreground mb-4">
        All tickets ({tickets.length})
      </h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border p-10 text-center mb-8" data-testid="empty-tickets">
          <Ticket className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No tickets yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {tickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Redemptions log */}
      <div className="border-t border-border pt-8">
        <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" /> Redemption log
        </h2>
        {redemptionsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : redemptions.length === 0 ? (
          <div className="bg-card rounded-3xl border border-border p-8 text-center" data-testid="empty-redemptions">
            <p className="text-muted-foreground">No redemptions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {redemptions.map(({ redemption, username, ticketName, ticketCode }) => (
              <motion.div
                key={redemption.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
                data-testid={`redemption-row-${redemption.id}`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{ticketName}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{ticketCode}</span>
                    {" — "}
                    <span className="font-medium text-foreground">{redemption.identifier}</span>
                    {" by "}
                    <span className="text-primary font-semibold">@{username}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-destructive/80">−{redemption.pointsSpent} pts</div>
                  <div className="text-xs text-muted-foreground">
                    {redemption.redeemedAt
                      ? format(new Date(redemption.redeemedAt), "MMM d, h:mm a")
                      : "just now"}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
