import { useProducts } from "@/hooks/use-products";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { QrCode, Loader2, Plus, Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Products() {
  const { data: products, isLoading, error } = useProducts();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !products) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <p className="text-destructive font-medium mb-4">Failed to load products</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Available Meals</h1>
          <p className="text-muted-foreground mt-2 text-lg">Purchase using e-wallet and earn points instantly.</p>
        </div>
        {user?.isAdmin && (
          <Link href="/products/new">
            <Button className="rounded-full h-12 px-6 font-semibold gap-2" data-testid="button-add-product">
              <Upload className="w-4 h-4" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed shadow-sm">
          <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No products found</h3>
          <p className="text-muted-foreground mt-1">Check back later for new meal.</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={item}>
              <Link href={`/products/${product.id}`}>
                <div className="group h-full bg-card rounded-3xl p-4 border border-border shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col">
                  {/* Image Container */}
                    <div className="aspect-square rounded-2xl overflow-hidden bg-secondary relative mb-5">
                    <img 
                      src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop"} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full shadow-sm">
                      <span className="font-bold text-sm text-foreground">{formatPrice(product.price)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-xl text-foreground line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="text-xs font-semibold text-accent flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        {Math.floor((product.price / 100) * 0.30)} pts
                      </span>
                      <Button variant="ghost" size="sm" className="rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <QrCode className="w-4 h-4 mr-2" />
                        Scan
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
