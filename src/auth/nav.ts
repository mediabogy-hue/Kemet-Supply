import React from "react";
import {
  LayoutDashboard, Box, ShoppingCart, Users, Settings, FileText, BarChart, ShieldCheck, DollarSign, Truck, Package, Banknote
} from "lucide-react";
import type { UserRole } from "./permissions";

export type NavLink = {
  href: string;
  label: string;
  icon: React.ReactElement;
  roles: UserRole[];
};

export const navLinks: NavLink[] = [
    // Dropshipper Links
    {
        href: "/dashboard",
        label: "لوحة التحكم",
        icon: React.createElement(LayoutDashboard),
        roles: ['Dropshipper'],
    },
    {
        href: "/products",
        label: "المنتجات",
        icon: React.createElement(Box),
        roles: ['Dropshipper'],
    },
    {
        href: "/orders/new",
        label: "طلب جديد",
        icon: React.createElement(ShoppingCart),
        roles: ['Dropshipper'],
    },
    {
        href: "/orders",
        label: "طلباتي",
        icon: React.createElement(Package),
        roles: ['Dropshipper'],
    },
    {
        href: "/reports",
        label: "التقارير المالية",
        icon: React.createElement(FileText),
        roles: ['Dropshipper'],
    },
     {
        href: "/policy",
        label: "سياسة السحب",
        icon: React.createElement(ShieldCheck),
        roles: ['Dropshipper'],
    },

    // Merchant Links
    {
        href: "/merchant/dashboard",
        label: "لوحة التحكم",
        icon: React.createElement(LayoutDashboard),
        roles: ['Merchant'],
    },
    {
        href: "/merchant/products",
        label: "منتجاتي",
        icon: React.createElement(Box),
        roles: ['Merchant'],
    },
    {
        href: "/merchant/orders",
        label: "طلبات منتجاتي",
        icon: React.createElement(ShoppingCart),
        roles: ['Merchant'],
    },
    {
        href: "/merchant/inventory",
        label: "مخزوني",
        icon: React.createElement(Package),
        roles: ['Merchant'],
    },

    // Admin & Staff Links
    {
        href: "/admin/dashboard",
        label: "لوحة التحكم",
        icon: React.createElement(LayoutDashboard),
        roles: ['Admin', 'OrdersManager', 'FinanceManager'],
    },
    {
        href: "/admin/orders",
        label: "إدارة الطلبات",
        icon: React.createElement(ShoppingCart),
        roles: ['Admin', 'OrdersManager'],
    },
     {
        href: "/admin/shipping",
        label: "الشحن والتوصيل",
        icon: React.createElement(Truck),
        roles: ['Admin', 'OrdersManager'],
    },
    {
        href: "/admin/products",
        label: "إدارة المنتجات",
        icon: React.createElement(Box),
        roles: ['Admin'],
    },
    {
        href: "/admin/categories",
        label: "الفئات",
        icon: React.createElement(FileText),
        roles: ['Admin'],
    },
    {
        href: "/admin/inventory",
        label: "المخزون",
        icon: React.createElement(Package),
        roles: ['Admin'],
    },
    {
        href: "/admin/withdrawals",
        label: "طلبات السحب",
        icon: React.createElement(Banknote),
        roles: ['Admin', 'FinanceManager'],
    },
    {
        href: "/admin/payments",
        label: "تأكيد الدفع",
        icon: React.createElement(DollarSign),
        roles: ['Admin', 'FinanceManager'],
    },
    {
        href: "/admin/users",
        label: "إدارة المستخدمين",
        icon: React.createElement(Users),
        roles: ['Admin'],
    },
     {
        href: "/admin/reports",
        label: "التقارير",
        icon: React.createElement(BarChart),
        roles: ['Admin'],
    },
    {
        href: "/admin/logs",
        label: "سجل النشاط",
        icon: React.createElement(FileText),
        roles: ['Admin'],
    },
     {
        href: "/admin/marketing",
        label: "التسويق الآلي",
        icon: React.createElement(Users),
        roles: ['Admin'],
    },
    {
        href: "/admin/settings",
        label: "الإعدادات",
        icon: React.createElement(Settings),
        roles: ['Admin'],
    },
];
