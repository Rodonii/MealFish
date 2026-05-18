import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ImagePlus, Loader2, ShieldAlert, QrCode, Globe, Save } from "lucide-react";

interface SettingsResponse {
  logoUrl: string | null;
  paymentQrUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  aboutText: string | null;
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
  const [socialBusy, setSocialBusy] = React.useState(false);
  const [facebookUrl, setFacebookUrl] = React.useState("");
  const [instagramUrl, setInstagramUrl] = React.useState("");
  const [tiktokUrl, setTiktokUrl] = React.useState("");
  const [aboutText, setAboutText] = React.useState("");

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: [api.settings.get.path],
  });

  React.useEffect(() => {
    if (data) {
      setFacebookUrl(data.facebookUrl || "");
      setInstagramUrl(data.instagramUrl || "");
      setTiktokUrl(data.tiktokUrl || "");
      setAboutText(data.aboutText || "");
    }
  }, [data]);

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

  const handleSaveSocial = async () => {
    setSocialBusy(true);
    try {
      await apiRequest("POST", api.settings.setSocial.path, {
        facebookUrl: facebookUrl || "",
        instagramUrl: instagramUrl || "",
        tiktokUrl: tiktokUrl || "",
        aboutText: aboutText || "",
      });
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "Social links saved", description: "Your footer info is live." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Could not save.", variant: "destructive" });
    } finally {
      setSocialBusy(false);
    }
  };

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
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6 mb-6">
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

      {/* Social & Footer */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Footer & Social Media
          </h2>
          <p className="text-sm text-muted-foreground">
            These links appear at the bottom of the login page for customers to follow you or learn more about FishTil.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="about-text">About Us text</label>
            <textarea
              id="about-text"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="e.g. FishTil serves fresh shredded fish meals made with love. Follow us for daily specials!"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              data-testid="input-about-text"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="fb-url">Facebook URL</label>
              <input
                id="fb-url"
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full h-12 px-4 rounded-xl border-2 border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                data-testid="input-facebook"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="ig-url">Instagram URL</label>
              <input
                id="ig-url"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full h-12 px-4 rounded-xl border-2 border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                data-testid="input-instagram"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="tt-url">TikTok URL</label>
              <input
                id="tt-url"
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/..."
                className="w-full h-12 px-4 rounded-xl border-2 border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                data-testid="input-tiktok"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSocial}
            disabled={socialBusy}
            className="gap-2"
            data-testid="button-save-social"
          >
            {socialBusy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save footer info</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
