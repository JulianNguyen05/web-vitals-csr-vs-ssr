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
      <div className="max-w-6xl mx-auto px-4">
        <SiteHeader
          storeLabel="T&Q Mart (CSR)"
          cartQuantity={totalQuantity}
          LinkComponent={RouterLink}
        />
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
