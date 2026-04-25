import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ImagePlus, Loader2, ShieldAlert, QrCode } from "lucide-react";

interface SettingsResponse {
  logoUrl: string | null;
  paymentQrUrl: string | null;
}

type SettingKind = "logo" | "paymentQr";

export default function Branding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const qrInputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState<SettingKind | null>(null);
  const [previewLogo, setPreviewLogo] = React.useState("");
  const [previewQr, setPreviewQr] = React.useState("");

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: [api.settings.get.path],
  });

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 w-full text-center py-20">
        <ShieldAlert className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admins only</h1>
        <p className="text-muted-foreground mb-8">
          Branding is restricted to the admin account.
        </p>
        <Link href="/products">
          <Button data-testid="button-back-products">Back to products</Button>
        </Link>
      </div>
    );
  }

  const uploadAndSave = async (file: File, kind: SettingKind) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }

    const local = URL.createObjectURL(file);
    if (kind === "logo") setPreviewLogo(local);
    else setPreviewQr(local);

    try {
      setBusy(kind);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(api.products.upload.path, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "x-user-id": String(user.id) },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      const json = (await res.json()) as { url: string };

      if (kind === "logo") {
        await apiRequest("POST", api.settings.setLogo.path, { logoUrl: json.url });
        setPreviewLogo("");
        toast({ title: "Logo updated", description: "Your new logo is live." });
      } else {
        await apiRequest("POST", api.settings.setPaymentQr.path, { paymentQrUrl: json.url });
        setPreviewQr("");
        toast({ title: "Payment QR updated", description: "Customers will see your e-wallet QR at checkout." });
      }
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not save the image.", variant: "destructive" });
      if (kind === "logo") setPreviewLogo("");
      else setPreviewQr("");
    } finally {
      setBusy(null);
    }
  };

  const currentLogo = previewLogo || data?.logoUrl || "";
  const currentQr = previewQr || data?.paymentQrUrl || "";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group" data-testid="link-back-to-products">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Branding & Payment</h1>
        <p className="text-muted-foreground mt-2 text-lg">Upload your store logo and your e-wallet QR code.</p>
      </div>

      {/* Store logo */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6 mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Store logo</h2>
          <p className="text-sm text-muted-foreground">Shown in the header and login screen.</p>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSave(f, "logo"); }}
          className="hidden"
          data-testid="input-logo-file"
        />
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : currentLogo ? (
              <img src={currentLogo} alt="logo" className="w-full h-full object-cover" data-testid="img-current-logo" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <Button
              onClick={() => logoInputRef.current?.click()}
              disabled={busy === "logo"}
              className="gap-2"
              data-testid="button-pick-logo"
            >
              {busy === "logo" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><ImagePlus className="w-4 h-4" /> {data?.logoUrl ? "Replace logo" : "Upload logo"}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF, WebP up to 5MB</p>
          </div>
        </div>
      </div>

      {/* Payment QR */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" /> E-wallet payment QR
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload a screenshot of your GCash, Maya, or other e-wallet QR. Customers scan this on the product page to pay you the exact price.
          </p>
        </div>
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSave(f, "paymentQr"); }}
          className="hidden"
          data-testid="input-qr-file"
        />
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-2xl bg-white border border-border overflow-hidden flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : currentQr ? (
              <img src={currentQr} alt="payment qr" className="w-full h-full object-contain" data-testid="img-current-qr" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">No QR</span>
            )}
          </div>
          <div className="flex-1">
            <Button
              onClick={() => qrInputRef.current?.click()}
              disabled={busy === "paymentQr"}
              className="gap-2"
              data-testid="button-pick-qr"
            >
              {busy === "paymentQr" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><ImagePlus className="w-4 h-4" /> {data?.paymentQrUrl ? "Replace QR" : "Upload QR"}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Tip: take a clean screenshot of the QR from your e-wallet app.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
