import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Pencil, PlusCircle, ShieldAlert, Trash2, UserCog, Users } from "lucide-react";

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  ingredients: string;
  nutrition: string;
  addOns: string;
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  ingredients: "",
  nutrition: "",
  addOns: "[]",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [productForm, setProductForm] = useState<ProductFormState>(emptyForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const fetchWithAuth = async <T,>(input: string, init: RequestInit = {}): Promise<T> => {
    if (!user?.id) {
      throw new Error("User session is missing");
    }

    const headers = new Headers(init.headers || {});
    headers.set("x-user-id", String(user.id));
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(payload.message || "Request failed");
    }

    return (await res.json()) as T;
  };

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchWithAuth<{ id: number; name: string; description: string; price: number; imageUrl: string; ingredients: string; nutrition: string; addOns: string }[]>("/api/products"),
    enabled: !!user,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchWithAuth<Array<{ id: number; username: string; points: number; role: "user" | "admin"; isAdmin: boolean }>>("/api/admin/users"),
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => fetchWithAuth<Array<{
      id: number;
      userId: number;
      productId: number;
      amount: number;
      pointsEarned: number;
      username: string | null;
      productName: string | null;
      status: string | null;
      createdAt: string | null;
    }>>("/api/admin/transactions"),
    enabled: !!user,
  });

  const productMutation = useMutation({
    mutationFn: async () => {
      const numericPrice = Number.parseFloat(productForm.price);
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Math.round(numericPrice * 100),
        imageUrl: productForm.imageUrl.trim(),
        ingredients: productForm.ingredients || "",
        nutrition: productForm.nutrition || "",
        addOns: productForm.addOns || "[]",
      };

      if (!payload.name || !payload.description || !payload.imageUrl || Number.isNaN(numericPrice) || numericPrice <= 0) {
        throw new Error("Please fill in a valid product name, description, image URL, and price.");
      }

      if (editingProductId) {
        return fetchWithAuth(`/api/products/${editingProductId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }

      return fetchWithAuth("/api/products", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      setProductForm(emptyForm);
      setEditingProductId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => fetchWithAuth(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: "user" | "admin" }) =>
      fetchWithAuth(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const updateUserPointsMutation = useMutation({
    mutationFn: async ({ id, points }: { id: number; points: number }) =>
      fetchWithAuth(`/api/admin/users/${id}/points`, {
        method: "PATCH",
        body: JSON.stringify({ points }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const adminCount = users.filter((entry) => entry.role === "admin" || entry.isAdmin).length;

  const currentUserIsAdmin = !!user && (user.role === "admin" || !!user.isAdmin);

  const totalRevenue = useMemo(
    () => transactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0),
    [transactions],
  );

  if (!currentUserIsAdmin) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-muted-foreground">Unauthorized</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
          <ShieldAlert className="h-4 w-4" />
          {users.length} registered users
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{(totalRevenue / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlusCircle className="h-5 w-5" />
            {editingProductId ? "Edit product" : "Add product"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Product name"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Product image URL"
              value={productForm.imageUrl}
              onChange={(event) => setProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Price in PHP"
              value={productForm.price}
              onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
            />
            <Input
              placeholder="Product ingredients JSON"
              value={productForm.ingredients}
              onChange={(event) => setProductForm((prev) => ({ ...prev, ingredients: event.target.value }))}
            />
          </div>

          <textarea
            className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Description"
            value={productForm.description}
            onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Nutrition JSON"
              value={productForm.nutrition}
              onChange={(event) => setProductForm((prev) => ({ ...prev, nutrition: event.target.value }))}
            />
            <textarea
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Add-ons JSON"
              value={productForm.addOns}
              onChange={(event) => setProductForm((prev) => ({ ...prev, addOns: event.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={() => productMutation.mutate()} disabled={productMutation.isPending}>
              {editingProductId ? "Save changes" : "Add product"}
            </Button>
            {editingProductId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            User management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.username}</TableCell>
                    <TableCell>
                      <Badge variant={entry.role === "admin" || entry.isAdmin ? "default" : "secondary"}>
                        {entry.role === "admin" || entry.isAdmin ? "admin" : "user"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={entry.points}
                        onBlur={(event) => {
                          const nextValue = Number(event.target.value || 0);
                          if (!Number.isNaN(nextValue) && nextValue !== entry.points) {
                            updateUserPointsMutation.mutate({ id: entry.id, points: nextValue });
                          }
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={entry.role === "admin" || entry.isAdmin ? "secondary" : "default"}
                          disabled={adminCount <= 1 && (entry.role === "admin" || entry.isAdmin)}
                          onClick={() =>
                            updateUserRoleMutation.mutate({
                              id: entry.id,
                              role: entry.role === "admin" || entry.isAdmin ? "user" : "admin",
                            })
                          }
                        >
                          {entry.role === "admin" || entry.isAdmin ? "Demote" : "Promote"}
                        </Button>
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>₱{(product.price / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <img src={product.imageUrl} alt={product.name} className="h-12 w-12 rounded object-cover" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProductId(product.id);
                            setProductForm({
                              name: product.name,
                              description: product.description,
                              price: String(product.price / 100),
                              imageUrl: product.imageUrl,
                              ingredients: product.ingredients ?? "",
                              nutrition: product.nutrition ?? "",
                              addOns: product.addOns ?? "[]",
                            });
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.username ?? `User #${txn.userId}`}</TableCell>
                    <TableCell>{txn.productName ?? `Product #${txn.productId}`}</TableCell>
                    <TableCell>₱{(txn.amount / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={txn.status === "confirmed" ? "default" : "secondary"}>{txn.status ?? "confirmed"}</Badge>
                    </TableCell>
                    <TableCell>{txn.createdAt ? format(new Date(txn.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
