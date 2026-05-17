import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "./pages/login";
import Products from "./pages/products";
import ProductDetail from "./pages/product-detail";
import NewProduct from "./pages/new-product";
import Branding from "./pages/branding";
import Payments from "./pages/payments";
import History from "./pages/history";
import Rewards from "./pages/rewards";
import AdminTickets from "./pages/admin-tickets";

function ProtectedRoute({ component: Component, ...rest }: { component: any, path: string }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Redirect authenticated users away from login
  if (user && location === "/") {
    return <Redirect to="/products" />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/products">
          {() => <ProtectedRoute component={Products} path="/products" />}
        </Route>
        <Route path="/products/new">
          {() => <ProtectedRoute component={NewProduct} path="/products/new" />}
        </Route>
        <Route path="/products/:id">
          {() => <ProtectedRoute component={ProductDetail} path="/products/:id" />}
        </Route>
        <Route path="/branding">
          {() => <ProtectedRoute component={Branding} path="/branding" />}
        </Route>
        <Route path="/payments">
          {() => <ProtectedRoute component={Payments} path="/payments" />}
        </Route>
        <Route path="/history">
          {() => <ProtectedRoute component={History} path="/history" />}
        </Route>
        <Route path="/rewards">
          {() => <ProtectedRoute component={Rewards} path="/rewards" />}
        </Route>
        <Route path="/admin/tickets">
          {() => <ProtectedRoute component={AdminTickets} path="/admin/tickets" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
