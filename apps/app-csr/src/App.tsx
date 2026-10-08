import { Routes, Route } from "react-router-dom";
import { ProductListPage } from "./pages/ProductListPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { useCartStore } from "@repo/cart-store";
import { SiteHeader } from "@repo/ui";
import { RouterLink } from "./components/RouterLink";

function App() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader
        storeLabel="T&Q Mart (CSR)"
        cartQuantity={totalQuantity}
        LinkComponent={RouterLink}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
