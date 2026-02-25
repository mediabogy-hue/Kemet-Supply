

import type { Timestamp } from "firebase/firestore";

// This is based on the `Product` entity in `docs/backend.json`
export interface Product {
  id: string;
  name: string;
  description: string;
  category?: string;
  price: number;
  commission: number;
  stockQuantity: number;
  isAvailable: boolean;
  videoUrl?: string;
  imageUrls: string[];
  purchaseUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  merchantId?: string;
  merchantName?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
  isAvailable?: boolean;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
  productCount?: number; // Calculated on client
}


export interface UserProfile {
  id: string;
  email: string;
  role: 'Dropshipper' | 'Admin' | 'OrdersManager' | 'FinanceManager' | 'ProductManager';
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  initialPasswordChangeRequired?: boolean;
  paymentDetails?: {
    vodafoneCash?: string;
    instaPay?: string;
    bankAccount?: string;
    telda?: string;
  };
  monthlySalesTarget?: number;
  monthlyReward?: number;
  lastSeen?: Timestamp;
  shiftStatus?: 'on' | 'off';
  activeShiftId?: string | null;
  activeShiftStartTime?: Timestamp | null;
  canTrackShift?: boolean;
  referrerId?: string;
  referralCode?: string;
  level?: 'Beginner Marketer' | 'Professional Marketer' | 'Gold Partner' | 'Platinum Partner';
  referredUsersCount?: number;
  staffDetails?: {
    monthlyTask?: string;
    taskProgress?: number;
    taskReward?: number;
  };
}

export interface Order {
  id: string;
  dropshipperId: string;
  dropshipperName?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerPaymentMethod: string;
  customerNotes?: string;
  totalAmount: number;
  totalCommission: number;
  platformFee: number;
  status: string; // 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Returned'
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Denormalized product info
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCommission: number;
  // Stock management fields
  confirmedAt?: Timestamp;
  confirmedBy?: {
    userId: string;
    role: string;
  };
  stockApplied?: boolean;
  stockAppliedAt?: Timestamp;
  stockRestored?: boolean;
  stockError?: {
    code: string;
    message: string;
    item: {
      productId: string;
      needed: number;
      available: number;
    };
  } | null;
  // Customer direct payment status
  customerPaymentStatus?: 'Pending' | 'Verified' | 'Rejected';
  customerPaymentProof?: {
    senderPhoneNumber?: string;
    referenceNumber?: string;
  };
  // External merchant info
  merchantInfo?: {
    name: string;
    phone: string;
    whatsapp: string;
  };
  merchantId?: string;
  adminNotes?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  dropshipperId: string;
  carrier: 'Bosta';
  bostaTrackingNumber: string;
  bostaShipmentId: string;
  status: 'CREATED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELED';
  fees: {
    shipping: number;
    cod: number;
    total: number;
  };
  codAmount: number;
  labelUrl: string;
  pickupDate: Timestamp;
  expectedDeliveryDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ShipmentEvent {
  id: string;
  timestamp: Timestamp;
  status: string;
  description: string;
  rawPayload?: string;
}


export interface StockLedger {
  id: string;
  productId: string;
  orderId: string;
  changeQty: number; // -ve for deduction, +ve for restore
  type: 'DEDUCT' | 'RESTORE' | 'MANUAL_ADJUST';
  reason: 'ORDER_CONFIRMED' | 'ORDER_CANCELLED' | 'ORDER_RETURNED' | 'MANUAL_CORRECTION';
  createdAt: Timestamp;
  actor: {
    userId: string;
    role: string;
  };
  note?: string;
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    method: 'Vodafone Cash' | 'InstaPay' | 'Bank Transfer' | 'Telda';
    paymentIdentifier: string;
    status: 'Pending' | 'Completed' | 'Rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    adminNotes?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    identifier: string;
    instructions: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  orderId: string;
  dropshipperId: string;
  dropshipperName: string;
  paymentMethodId: string;
  amount: number;
  status: 'Pending' | 'Verified' | 'Rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  adminNotes?: string;
  senderPhoneNumber?: string;
  referenceNumber?: string;
  proof?: { url: string; path?: string; };
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
    ipAddress?: string;
    // For display
    userName?: string; 
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'order_status_update' | 'payment_verified' | 'new_bonus' | 'new_message' | 'general_announcement';
  isRead: boolean;
  link?: string;
  createdAt: Timestamp;
}
    
export interface Conversation {
  id: string;
  participantIds: string[];
  participantDetails: {
    [key: string]: {
      name: string;
      role: UserProfile['role'];
    }
  };
  lastMessageText?: string;
  lastMessageTimestamp: Timestamp;
  lastMessageSenderId?: string;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

export interface WorkSession {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  durationMinutes?: number;
}

export interface ProductClick {
  id: string;
  productId: string;
  dropshipperId: string;
  createdAt: Timestamp;
}

export interface MerchantInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  message: string;
  status: 'New' | 'Contacted' | 'Closed';
  createdAt: Timestamp;
}

export interface Bonus {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: Timestamp;
  adminId: string;
  adminName: string;
}

export interface ReferredCustomer {
  id: string;
  referralMarketerId: string;
  contactId: string; // e.g., phone number
  channel: 'whatsapp' | 'messenger' | 'instagram' | 'web';
  segment: string;
  consentStatus: 'granted' | 'denied' | 'pending';
  createdAt: Timestamp;
  lastInteractionAt: Timestamp;
  name?: string;
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
        promoByCategory: boolean;
    };
}
