import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton";

interface RecentSalesProps {
    data?: {
        id: string;
        name: string;
        email: string;
        amount: string;
    }[];
}
  
export function RecentSales({ data }: RecentSalesProps) {
    if (!data) {
        return (
            <div className="space-y-6">
                {Array.from({length: 5}).map((_, i) => (
                    <div className="flex items-center" key={i}>
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ms-4 space-y-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-3 w-[150px]" />
                        </div>
                        <Skeleton className="ms-auto h-5 w-[60px]" />
                    </div>
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات لعرضها.</p>
        );
    }

    return (
      <div className="space-y-6">
          {data.map((sale) => (
              <div className="flex items-center" key={sale.id}>
                  <Avatar className="h-10 w-10 border">
                      <AvatarImage src={`https://avatar.vercel.sh/${sale.name}.png`} alt="Avatar" />
                      <AvatarFallback>{sale.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ms-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.name}</p>
                      <p className="text-sm text-muted-foreground">{sale.email}</p>
                  </div>
                  <div className="ms-auto font-semibold">{sale.amount}</div>
              </div>
          ))}
      </div>
    )
  }
  