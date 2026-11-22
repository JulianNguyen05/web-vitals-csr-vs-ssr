export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductRating {
  average: number; // 0 - 5
  count: number;
}

export interface ProductDimensions {
  length: number; // cm
  width: number; // cm
  height: number; // cm
}

export interface Product {
  // --- Trường gốc (giữ nguyên, không đổi để không phá vỡ UI hiện có) ---
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryId: string;
  thumbUrl: string;
  detailUrl: string;
  description: string;

  // --- Trường mở rộng (thêm mới, đều optional để tương thích ngược) ---
  brand?: string;
  sku?: string;
  originalPrice?: number; // giá gốc trước giảm
  discountPercent?: number; // % giảm giá
  unit?: string; // đơn vị tính: cái, bộ, kg, chai...
  shortDescription?: string; // mô tả ngắn dùng ở trang danh mục
  gallery?: string[]; // ảnh phụ ngoài thumbUrl/detailUrl
  specifications?: Record<string, string>; // thông số kỹ thuật, tuỳ theo ngành hàng
  rating?: ProductRating;
  stock?: number; // tồn kho
  soldCount?: number; // đã bán
  weight?: number; // gram
  dimensions?: ProductDimensions;
  origin?: string; // xuất xứ
  warranty?: string; // chính sách bảo hành/đổi trả
  tags?: string[];
  createdAt?: string; // ISO date string
}

/** Dữ liệu tối thiểu trang giỏ hàng cần cho mỗi sản phẩm. */
export type CartProduct = Pick<Product, "id" | "name" | "price" | "thumbUrl">;

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: number;
}
