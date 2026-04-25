import { useAuth } from "@/hooks/use-auth";
import { useUserTransactions } from "@/hooks/use-transactions";
import { useProducts } from "@/hooks/use-products";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Receipt, Calendar, ArrowUpRight, Zap, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function History() {
  const { user } = useAuth();
  const { data: transactions, isLoading: txLoading } = useUserTransactions(user?.id);
  const { data: products, isLoading: productsLoading } = useProducts();

  const isLoading = txLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Create a map for quick product lookups
  const productMap = new Map(products?.map(p => [p.id, p]));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground mt-2 text-lg">Review your past purchases and points earned.</p>
      </div>

      {!transactions || transactions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[2rem] p-12 text-center border shadow-sm"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Receipt className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">No transactions yet</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            You haven't made any purchases. Head over to the products page, scan a QR code, and start earning points!
          </p>
          <Link href="/products">
            <Button className="rounded-xl h-12 px-8 font-semibold">
              Browse Products
            </Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {transactions.slice().reverse().map((tx) => {
            const product = productMap.get(tx.productId);
            // Handling robust date parsing
            const date = new Date(tx.createdAt);
            const isValidDate = !isNaN(date.getTime());

            return (
              <motion.div 
                key={tx.id} 
                variants={item}
                className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center gap-4 group"
              >
                {/* Product Icon/Image */}
                <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 hidden sm:block">
                  {product?.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-lg text-foreground truncate pr-4">
                      {product?.name || `Product #${tx.productId}`}
                    </h4>
                    <span className="font-bold text-foreground shrink-0">
                      {formatPrice(tx.amount)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                      {isValidDate ? format(date, "MMM d, yyyy • h:mm a") : 'Unknown date'}
                    </div>
                    <div className="flex items-center text-accent font-semibold bg-accent/10 px-2.5 py-0.5 rounded-md">
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      +{tx.pointsEarned} pts
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-4 border-t sm:border-t-0 sm:pt-0 sm:pl-4 sm:border-l border-border/50">
                  <Link href={`/products/${tx.productId}`}>
                    <Button variant="ghost" size="icon" className="w-full sm:w-10 sm:h-10 rounded-xl group-hover:bg-primary/5 group-hover:text-primary">
                      <span className="sm:hidden mr-2">Buy Again</span>
                      <ArrowUpRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
