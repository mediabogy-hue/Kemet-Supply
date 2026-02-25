
import React from "react";
import {
  LayoutDashboard, Box, ShoppingCart, Users, Settings, FileText,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: React.ReactElement;
  roles: ('Admin' | 'Dropshipper' | 'Staff')[];
};

export const navLinks: NavLink[] = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: React.createElement(LayoutDashboard),
        roles: ['Dropshipper'],
    },
    {
        href: "/products",
        label: "Products",
        icon: React.createElement(Box),
        roles: ['Dropshipper'],
    },
    {
        href: "/orders",
        label: "My Orders",
        icon: React.createElement(ShoppingCart),
        roles: ['Dropshipper'],
    },
    {
        href: "/admin/dashboard",
        label: "Admin Dashboard",
        icon: React.createElement(LayoutDashboard),
        roles: ['Admin'],
    },
    {
        href: "/admin/orders",
        label: "Manage Orders",
        icon: React.createElement(ShoppingCart),
        roles: ['Admin'],
    },
    {
        href: "/admin/products",
        label: "Manage Products",
        icon: React.createElement(Box),
        roles: ['Admin'],
    },
    {
        href: "/admin/users",
        label: "Manage Users",
        icon: React.createElement(Users),
        roles: ['Admin'],
    },
    {
        href: "/admin/reports",
        label: "Reports",
        icon: React.createElement(FileText),
        roles: ['Admin'],
    },
    {
        href: "/admin/settings",
        label: "Settings",
        icon: React.createElement(Settings),
        roles: ['Admin'],
    },
];
