# **App Name**: Tashghil Dropship

## Core Features:

- User Authentication & Authorization: Secure dropshipper registration, login, and password reset. Implement robust Role-Based Access Control (RBAC) for Admin users, including an initial Admin setup with mandatory password change and bcrypt encryption.
- Dropshipper Dashboard & Analytics: A clear dashboard for dropshippers displaying total orders, pending/completed/returned orders, total sales, net profits, and daily/weekly/monthly charts. Includes exportable PDF/Excel reports.
- Product Management & Order Placement: Dropshippers can view all available products, copy product links, and create direct orders by entering customer details, product, quantity, and price. Admin users have full CRUD capabilities for products (name, description, images, price, stock, availability). Unique order numbers are generated for each order.
- Order & Payment Tracking: Real-time order status tracking for dropshippers (Pending, Confirmed, Shipped, Delivered, Returned). Admin can update order statuses. Includes integration for Vodafone Cash and InstaPay, display payment details with copy-to-clipboard functionality, payment proof upload, and payment status management (Under Review / Approved / Rejected).
- Admin System Management: A comprehensive Admin panel for managing dropshippers (add/edit/deactivate/delete), system products (CRUD), updating order statuses, configuring payment methods, managing general system settings, user permissions, and reviewing a full audit log of sensitive operations.
- Automated Google Drive Sync: Integrate with Google Drive API via a Service Account to automatically store JSON files of new orders, uploaded payment proofs with metadata, generated reports, and sensitive audit logs. Includes a queue/retry mechanism for failed uploads and admin alerts for synchronization failures.
- Multi-language UI Support: Provide a professional, fast, and modern user interface that supports both Arabic (RTL) and English (LTR) languages.

## Style Guidelines:

- Primary Color: A trustworthy and professional medium blue (#2E6BB4). This color represents reliability and digital efficiency, ensuring good contrast against the light background for key elements.
- Background Color: A very light, desaturated blue (#EBF1F4). This choice maintains visual consistency with the primary color while providing a clean and calming canvas for content readability.
- Accent Color: A vibrant cyan (#4DD9D9) to draw attention to call-to-action buttons, interactive elements, and important highlights, providing an energetic counterpoint to the primary and background hues.
- Body and Headline Font: 'Inter' (sans-serif) for its modern, neutral, and highly readable qualities, suitable for diverse content and ensuring clarity across both Arabic and English text in an administrative context.
- Utilize a consistent set of clean, line-based icons throughout the application. These icons should be universally understandable and contribute to a professional and uncluttered user interface, enhancing navigation and feature recognition.
- Employ a responsive and intuitive layout that adapts seamlessly to various screen sizes and supports both Left-to-Right (LTR) and Right-to-Left (RTL) text directions. Emphasize clear information hierarchy on dashboards and forms to enhance user efficiency.
- Integrate subtle, non-intrusive animations for transitions between pages, loading states, and interactive element feedback. This provides a fast and modern feel without distracting the user, improving overall perceived performance and user experience.