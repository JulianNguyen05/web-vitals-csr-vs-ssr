export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryId: string;
  thumbUrl: string;
  detailUrl: string;
  description?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: number;
}