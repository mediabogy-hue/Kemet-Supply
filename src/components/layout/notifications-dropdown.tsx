'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, DollarSign, MessageSquare } from "lucide-react"

// Dummy notifications data
const notifications = [
    {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        title: "تم تأكيد طلبك رقم #5462",
        time: "منذ 5 دقائق"
    },
    {
        icon: <DollarSign className="h-4 w-4 text-blue-500" />,
        title: "تم إضافة 250.00 ج.م إلى محفظتك",
        time: "منذ 1 ساعة"
    },
    {
        icon: <MessageSquare className="h-4 w-4 text-orange-500" />,
        title: "رسالة جديدة من فريق الدعم",
        time: "منذ 3 ساعات"
    }
]

export function NotificationsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col gap-1">
            {notifications.map((notification, index) => (
                 <DropdownMenuItem key={index} className="flex items-start gap-3 p-3">
                    <div className="mt-1">
                        {notification.icon}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium whitespace-normal">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                </DropdownMenuItem>
            ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center">
            عرض كل الإشعارات
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
