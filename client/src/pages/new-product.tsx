import React from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Upload, Loader2, ImagePlus, ArrowLeft, X, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { AddOnEditor, type AddOn } from "@/components/add-on-editor";

export default function NewProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 w-full text-center py-20">
        <ShieldAlert className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admins only</h1>
        <p className="text-muted-foreground mb-8">
          Adding products is restricted to the admin account. Log in as <span className="font-semibold">admin</span> to manage the catalog.
        </p>
        <Link href="/products">
          <Button data-testid="button-back-products">Back to products</Button>
        </Link>
      </div>
    );
  }

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priceText, setPriceText] = React.useState("");
  const [ingredientsText, setIngredientsText] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [addOns, setAddOns] = React.useState<AddOn[]>([]);

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

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

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
      const data = (await res.json()) as { url: string };
      setImageUrl(data.url);
      toast({ title: "Image uploaded", description: "Your product image is ready." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload image.", variant: "destructive" });
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const priceCents = Math.round(parseFloat(priceText) * 100);
      const ingredientsArr = ingredientsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: priceCents,
        imageUrl,
        ingredients: ingredientsArr.length ? JSON.stringify(ingredientsArr) : "",
        nutrition: "",
        addOns: JSON.stringify(addOns),
      };
      const res = await apiRequest("POST", api.products.create.path, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Product created!", description: "Your new product is now in the catalog." });
      setLocation("/products");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create product", description: err.message || "Please check the fields and try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Name and description are required.", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(priceText);
    if (!isFinite(priceNum) || priceNum <= 0) {
      toast({ title: "Invalid price", description: "Enter a price greater than 0.", variant: "destructive" });
      return;
    }
    if (!imageUrl) {
      toast({ title: "Image required", description: "Please upload a product image.", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const clearImage = () => {
    setImageUrl("");
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 group" data-testid="link-back-to-products">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Add a New Product</h1>
        <p className="text-muted-foreground mt-2 text-lg">Upload an image and fill in the details.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        {/* Image uploader */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Product Image</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-image-file"
          />

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary aspect-video">
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" data-testid="img-preview" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  Uploading...
                </div>
              )}
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md text-foreground"
                data-testid="button-clear-image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 text-muted-foreground"
              data-testid="button-pick-image"
            >
              <ImagePlus className="w-10 h-10" />
              <span className="font-medium">Click to upload an image</span>
              <span className="text-xs">PNG, JPG, GIF, WebP up to 5MB</span>
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="name" className="text-base font-semibold">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tonkatsu Special"
            className="mt-2"
            data-testid="input-name"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-base font-semibold">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of the product"
            rows={3}
            className="mt-2"
            data-testid="input-description"
          />
        </div>

        {/* Price */}
        <div>
          <Label htmlFor="price" className="text-base font-semibold">Price (PHP)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            placeholder="e.g., 199.00"
            className="mt-2"
            data-testid="input-price"
          />
        </div>

        {/* Ingredients */}
        <div>
          <Label htmlFor="ingredients" className="text-base font-semibold">Ingredients (one per line)</Label>
          <Textarea
            id="ingredients"
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={"Pork loin\nPanko breadcrumbs\nEgg"}
            rows={4}
            className="mt-2"
            data-testid="input-ingredients"
          />
        </div>

        {/* Add-ons / side dishes */}
        <div>
          <Label className="text-base font-semibold mb-1 block">Add-ons / Side dishes</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Optional extras the customer can add at checkout. Each one bumps the total and the points earned.
          </p>
          <AddOnEditor value={addOns} onChange={setAddOns} testIdPrefix="new-addon" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/products")}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || uploading}
            className="min-w-32"
            data-testid="button-submit"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Create Product</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
