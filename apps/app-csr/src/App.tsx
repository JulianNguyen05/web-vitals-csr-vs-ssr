import { Routes, Route, Link } from "react-router-dom";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { useCartStore } from "@repo/cart-store";

function App() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());

  return (
    <div>
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Link to="/" className="font-bold">T&Q Mart (CSR)</Link>
        <Link to="/cart">Giỏ hàng ({totalQuantity})</Link>
      </header>
      <Routes>
        <Route path="/" element={<CategoryPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </div>
  );
}

export default App;
