import { Routes, Route, Link } from "react-router-dom";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { useCartStore } from "@repo/cart-store";

function App() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <header className="flex items-center justify-between bg-background shadow-sm rounded-card px-6 py-3 mt-4 mb-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="w-6 h-6 rounded-md bg-accent text-white text-xs flex items-center justify-center">
              T
            </span>
            T&amp;Q Mart (CSR)
          </Link>
          <Link to="/cart" className="text-sm text-accent hover:text-accent-dark">
            Giỏ hàng ({totalQuantity})
          </Link>
        </header>
        <Routes>
          <Route path="/" element={<CategoryPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
