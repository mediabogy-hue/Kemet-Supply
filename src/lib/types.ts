

import type { Timestamp, FieldValue } from "firebase/firestore";

// This is based on the `User` entity in `docs/backend.json`
export interface UserProfile {
  id: string;
  email: string;
  role: 'Dropshipper' | 'Admin' | 'OrdersManager' | 'FinanceManager' | 'Merchant';
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
  isActive?: boolean;
  initialPasswordChangeRequired?: boolean;
  // Level for dropshippers
  level?: 'Beginner Marketer' | 'Professional Marketer' | 'Gold Partner' | 'Platinum Partner';
  // Shift tracking for dropshippers
  canTrackShift?: boolean;
  shiftStatus?: 'on' | 'off';
  activeShiftId?: string | null;
  activeShiftStartTime?: any;
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
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  imageUrls: string[];
  videoUrl?: string;
  purchaseUrl?: string;
  createdAt: any; 
  updatedAt: any; 
  merchantId?: string | null;
  merchantName?: string | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
  isAvailable: boolean;
  createdAt: any;
  updatedAt: any;
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
  createdAt: any;
  updatedAt: any;
  confirmedAt?: any;
  shippedAt?: any;
  deliveredAt?: any;
  returnedAt?: any;
  canceledAt?: any;
  // Denormalized product info
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  unitCommission: number;
  platformFee: number;
  adminNotes?: string;
  // Shipment link
  shipmentId?: string | null;
  shipmentTrackingNumber?: string | null;
  // Merchant Info
  merchantId?: string | null;
  merchantName?: string | null;
  isSettled?: boolean;
}

export interface Wallet {
    id: string; // Same as userId
    availableBalance: number;
    pendingBalance: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    updatedAt: any;
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    method: 'Vodafone Cash' | 'InstaPay' | 'Bank Transfer' | 'Telda';
    paymentIdentifier: string; // The phone number, handle, or account number
    status: 'Pending' | 'Completed' | 'Rejected';
    createdAt: any;
    updatedAt: any;
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
    createdAt: any;
    updatedAt: any;
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string;
    newValue?: string;
    createdAt: any;
}

export interface Bonus {
    id: string;
    userId: string;
    amount: number;
    reason: string;
    adminId: string;
    adminName: string;
    createdAt: any;
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
    createdAt: any;
    updatedAt: any;
    lastWebhookAt?: any;
    lastWebhookStatus?: string;
    lastWebhookPayload?: any;
    createdBy: string; // User ID of creator
}

export interface ShipmentEvent {
  id: string;
  status: string;
  description: string;
  timestamp: any;
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
  createdAt: any;
  lastInteractionAt: any;
}

export interface MerchantInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  message: string;
  status: 'New' | 'Contacted' | 'Approved' | 'Rejected';
  createdAt: any;
  updatedAt?: any;
  adminNotes?: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  targetSegment: string;
  channel: 'whatsapp' | 'messenger' | 'instagram';
  messageTemplate: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: any;
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

export interface ScrapedProductData {
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  category: string;
}
