import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export interface TransactionResponse {
  id: number;
  userId: number;
  productId: number;
  amount: number;
  pointsEarned: number;
  createdAt: string; // Dates often come back as strings in JSON
}

export function useUserTransactions(userId: number | undefined) {
  return useQuery({
    queryKey: [api.transactions.listUserTransactions.path, userId],
    queryFn: async () => {
      if (!userId) return [];
      const url = buildUrl(api.transactions.listUserTransactions.path, { id: userId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      return data as TransactionResponse[];
    },
    enabled: !!userId,
  });
}

export function usePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { userId: number; productId: number }) => {
      const res = await fetch(api.transactions.purchase.path, {
        method: api.transactions.purchase.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) throw new Error("Validation failed");
        if (res.status === 404) throw new Error("Product not found");
        throw new Error("Failed to process purchase");
      }
      
      return await res.json() as {
        success: boolean;
        transaction: TransactionResponse;
        newPointsTotal: number;
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.transactions.listUserTransactions.path, variables.userId] 
      });
    },
  });
}
