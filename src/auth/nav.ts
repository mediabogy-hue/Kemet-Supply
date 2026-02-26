
import React from "react";
import {
  LayoutDashboard, Box, ShoppingCart, Users, Settings, FileText,
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
        href: "/orders",
        label: "طلباتي",
        icon: React.createElement(ShoppingCart),
        roles: ['Dropshipper'],
    },
    {
        href: "/reports",
        label: "التقارير المالية",
        icon: React.createElement(FileText),
        roles: ['Dropshipper'],
    },
    // Admin Links
    {
        href: "/admin/dashboard",
        label: "لوحة التحكم",
        icon: React.createElement(LayoutDashboard),
        roles: ['Admin', 'OrdersManager', 'FinanceManager', 'ProductManager'],
    },
    {
        href: "/admin/orders",
        label: "إدارة الطلبات",
        icon: React.createElement(ShoppingCart),
        roles: ['Admin', 'OrdersManager'],
    },
    {
        href: "/admin/products",
        label: "إدارة المنتجات",
        icon: React.createElement(Box),
        roles: ['Admin', 'ProductManager'],
    },
    {
        href: "/admin/users",
        label: "إدارة المستخدمين",
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
