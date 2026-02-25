
import React from "react";
import {
  LayoutDashboard, Box, ShoppingCart, PlusCircle, Wallet, BookText,
  Users, Settings, FileText, ListOrdered, MessageSquare, Briefcase,
  DollarSign, Warehouse, BarChart3, Truck, Bot, Rocket,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: React.ReactElement;
};

// This is the same as the old UserRoles type.
export type UserRoles = {
  isAdmin: boolean;
  isOrdersManager: boolean;
  isFinanceManager: boolean;
  isProductManager: boolean;
};

// This function now lives in its own dedicated file.
export const getNavLinks = (roles: UserRoles): NavLink[] => {
    const { isAdmin, isOrdersManager, isFinanceManager, isProductManager } = roles;

    // Admin sees everything.
    if (isAdmin) {
        return [
            { href: "/admin/dashboard", label: "لوحة تحكم الأدمن", icon: React.createElement(LayoutDashboard) },
            { href: "/admin/orders", label: "إدارة الطلبات", icon: React.createElement(ListOrdered) },
            { href: "/admin/shipping", label: "إدارة الشحن", icon: React.createElement(Truck) },
            { href: "/admin/products", label: "الكتالوج", icon: React.createElement(Box) },
            { href: "/admin/inventory/external", label: "مخزن التجار", icon: React.createElement(Warehouse) },
            { href: "/admin/users", label: "إدارة المستخدمين", icon: React.createElement(Users) },
            { href: "/admin/inquiries", label: "طلبات التجار", icon: React.createElement(Briefcase) },
            { href: "/admin/withdrawals", label: "طلبات السحب", icon: React.createElement(DollarSign) },
            { href: "/admin/payments", label: "تأكيد دفعات العملاء", icon: React.createElement(Wallet) },
            { href: "/admin/reports", label: "التقارير", icon: React.createElement(BarChart3) },
            { href: "/admin/marketing", label: "التسويق الآلي", icon: React.createElement(Bot) },
            { href: "/messages", label: "الرسائل", icon: React.createElement(MessageSquare) },
            { href: "/admin/logs", label: "سجل النشاط", icon: React.createElement(FileText) },
            { href: "/admin/settings", label: "إعدادات النظام", icon: React.createElement(Settings) },
            { href: "/admin/devops", label: "تحديثات المشروع", icon: React.createElement(Rocket) },
        ];
    }
    
    const staffLinks = new Map<string, NavLink>();
    staffLinks.set("/messages", { href: "/messages", label: "الرسائل", icon: React.createElement(MessageSquare) });
    
    // Add links based on specific staff roles
    if (isProductManager) {
        staffLinks.set("/admin/products", { href: "/admin/products", label: "الكتالوج", icon: React.createElement(Box) });
        staffLinks.set("/admin/orders", { href: "/admin/orders", label: "متابعة الطلبات", icon: React.createElement(ListOrdered) });
        staffLinks.set("/admin/inventory/external", { href: "/admin/inventory/external", label: "مخزن خارجي", icon: React.createElement(Warehouse) });
    }
    
    if (isOrdersManager) {
        staffLinks.set("/admin/orders", { href: "/admin/orders", label: "إدارة الطلبات", icon: React.createElement(ListOrdered) });
        staffLinks.set("/admin/shipping", { href: "/admin/shipping", label: "إدارة الشحن", icon: React.createElement(Truck) });
    }

    if (isFinanceManager) {
        staffLinks.set("/admin/withdrawals", { href: "/admin/withdrawals", label: "طلبات السحب", icon: React.createElement(DollarSign) });
        staffLinks.set("/admin/payments", { href: "/admin/payments", label: "تأكيد دفعات العملاء", icon: React.createElement(Wallet) });
    }

    // If the user is any kind of staff, give them access to messages and return their specific links
    if (isProductManager || isOrdersManager || isFinanceManager) {
        return Array.from(staffLinks.values());
    }

    // Default links for Dropshipper (Marketer)
    return [
        { href: "/dashboard", label: "لوحة التحكم", icon: React.createElement(LayoutDashboard) },
        { href: "/products", label: "المنتجات", icon: React.createElement(Box) },
        { href: "/orders/new", label: "إنشاء طلب جديد", icon: React.createElement(PlusCircle) },
        { href: "/orders", label: "متابعة الطلبات", icon: React.createElement(ShoppingCart) },
        { href: "/reports", label: "المحفظة المالية", icon: React.createElement(Wallet) },
        { href: "/messages", label: "الرسائل", icon: React.createElement(MessageSquare) },
        { href: "/policy", label: "سياسات السحب", icon: React.createElement(BookText) },
    ];
}
