import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ImagePlus, Loader2, ShieldAlert } from "lucide-react";

interface SettingsResponse {
  logoUrl: string | null;
}

export default function Branding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string>("");

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: [api.settings.get.path],
  });

  const saveLogoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      const res = await apiRequest("POST", api.settings.setLogo.path, { logoUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "Logo updated", description: "Your new logo is now live." });
      setPreviewUrl("");
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Could not save the logo.", variant: "destructive" });
    },
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }

    const local = URL.createObjectURL(file);
    setPreviewUrl(local);

    try {
      setUploading(true);
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
      saveLogoMutation.mutate(json.url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload image.", variant: "destructive" });
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const currentLogo = previewUrl || data?.logoUrl || "";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group" data-testid="link-back-to-products">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Branding</h1>
        <p className="text-muted-foreground mt-2 text-lg">Upload your store logo. It will appear in the header for everyone.</p>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
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
              <span className="text-xs text-muted-foreground text-center px-2">No logo set</span>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Current logo</p>
            <p className="text-sm text-muted-foreground">
              {data?.logoUrl ? "Replace it by uploading a new image." : "Upload an image to set your store logo."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || saveLogoMutation.isPending}
            className="gap-2"
            data-testid="button-pick-logo"
          >
            {uploading || saveLogoMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><ImagePlus className="w-4 h-4" /> {data?.logoUrl ? "Replace logo" : "Upload logo"}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground self-center">PNG, JPG, GIF, WebP up to 5MB</p>
        </div>
      </div>
    </div>
  );
}
