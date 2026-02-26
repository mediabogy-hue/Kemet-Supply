import type { Timestamp } from "firebase/firestore";

// This is based on the `User` entity in `docs/backend.json`
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
  // Level for dropshippers
  level?: 'Beginner Marketer' | 'Professional Marketer' | 'Gold Partner' | 'Platinum Partner';
  // Shift tracking for dropshippers
  canTrackShift?: boolean;
  shiftStatus?: 'on' | 'off';
  activeShiftId?: string | null;
  activeShiftStartTime?: Timestamp | null;
  // Sales target for dropshippers
  monthlySalesTarget?: number;
  monthlyReward?: number;
  // For staff
  staffDetails?: {
    monthlyTask?: string;
    taskProgress?: number; // 0-100
    taskReward?: number;
  };
  // For payment info
  paymentDetails?: {
    vodafoneCash?: string;
    instaPay?: string;
    bankAccount?: string;
    telda?: string;
  };
}


export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  commission: number;
  stockQuantity: number;
  isAvailable: boolean;
  imageUrls: string[];
  videoUrl?: string;
  purchaseUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // For products added by merchants/product managers
  merchantId?: string;
  merchantName?: string;
  merchantInfo?: {
    name: string;
    phone: string;
    whatsapp: string;
  } | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
  isAvailable: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  id: string;
  dropshipperId: string;
  dropshipperName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerPaymentMethod: 'Cash on Delivery' | 'Vodafone Cash' | 'InstaPay' | 'Telda' | 'Bank Transfer';
  customerPaymentStatus?: 'Pending' | 'Verified' | 'Rejected' | null;
  customerPaymentProof?: {
    senderPhoneNumber?: string;
    referenceNumber?: string;
  } | null,
  customerNotes?: string;
  totalAmount: number;
  totalCommission: number;
  status: 'Pending' | 'Confirmed' | 'Ready to Ship' | 'Shipped' | 'Delivered' | 'Returned' | 'Canceled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmedAt?: Timestamp;
  shippedAt?: Timestamp;
  deliveredAt?: Timestamp;
  returnedAt?: Timestamp;
  canceledAt?: Timestamp;
  // Denormalized product info
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCommission: number;
  // Denormalized merchant info from product
  merchantId?: string | null;
  merchantName?: string | null;
  merchantInfo?: {
    name: string;
    phone: string;
    whatsapp: string;
  } | null;
  platformFee: number;
  adminNotes?: string;
  // Shipment link
  shipmentId?: string | null;
  shipmentTrackingNumber?: string | null;
}

export interface Wallet {
    id: string; // Same as userId
    availableBalance: number;
    pendingBalance: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    updatedAt: Timestamp;
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    method: 'Vodafone Cash' | 'InstaPay' | 'Bank Transfer' | 'Telda';
    paymentIdentifier: string; // The phone number, handle, or account number
    status: 'Pending' | 'Completed' | 'Rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Payment {
    id: string;
    orderId: string;
    dropshipperId: string;
    dropshipperName: string;
    paymentMethodId: string; // e.g., 'Vodafone Cash'
    amount: number;
    status: 'Pending' | 'Verified' | 'Rejected';
    senderPhoneNumber: string;
    referenceNumber: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string;
    newValue?: string;
    createdAt: Timestamp;
}

export interface Bonus {
    id: string;
    userId: string;
    amount: number;
    reason: string;
    adminId: string;
    adminName: string;
    createdAt: Timestamp;
}

export interface Shipment {
    id: string;
    orderId: string;
    dropshipperId: string;
    carrier: 'Bosta' | 'Manual';
    bostaTrackingNumber: string;
    bostaShipmentId: string;
    status: 'CREATED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELED';
    codAmount: number;
    labelUrl?: string;
    fees?: {
        shipping: number;
        cod: number;
        total: number;
    },
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastWebhookAt?: Timestamp;
    lastWebhookStatus?: string;
    lastWebhookPayload?: any;
    createdBy: string; // User ID of creator
}

export interface ShipmentEvent {
  id: string;
  status: string;
  description: string;
  timestamp: Timestamp;
}

// For Marketing Automation
export interface ReferredCustomer {
  id: string; // customer contact ID (e.g. phone number)
  referralMarketerId: string;
  contactId: string;
  name?: string;
  channel: 'whatsapp' | 'messenger' | 'instagram' | 'web';
  segment: string; // e.g., 'electronics_interest'
  consentStatus: 'granted' | 'pending' | 'denied';
  createdAt: Timestamp;
  lastInteractionAt: Timestamp;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  targetSegment: string;
  channel: 'whatsapp' | 'messenger' | 'instagram';
  messageTemplate: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Timestamp;
}

export interface AutomationSettings {
  enabled: boolean;
  antiSpam: {
    maxPerDayPerUser: number;
    minMinutesBetweenMessages: number;
  };
  triggers: {
    inquiryFollowUp: boolean;
    abandonedCheckout: boolean;
    orderConfirmation: boolean;
    shippingUpdates: boolean;
  };
}
