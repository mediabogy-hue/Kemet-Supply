
import type { Timestamp } from "firebase/firestore";

// This is based on the `Product` entity in `docs/backend.json`
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  commission: number;
  stockQuantity: number;
  isAvailable: boolean;
  videoUrl?: string;
  imageUrls: string[];
  purchaseUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductCategory {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
}


export interface UserProfile {
  id: string;
  email: string;
  role: 'Dropshipper' | 'Admin' | 'OrdersManager' | 'FinanceManager' | 'ProductManager';
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isActive?: boolean;
  initialPasswordChangeRequired?: boolean;
}

export interface Order {
  id: string;
  dropshipperId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  totalAmount: number;
  totalCommission: number;
  status: string; // 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Returned'
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Denormalized product info
  productId: string;
  productName: string;
  quantity: number;
}
