"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardDescription } from "@/components/ui/card";

interface SalesByHourChartProps {
    data: { name: string; total: number }[];
}

export function SalesByHourChart({ data }: SalesByHourChartProps) {
    
    const hasSalesData = data && data.some(d => d.total > 0);

    if (!hasSalesData) {
        return (
            <div className="flex h-[250px] items-center justify-center">
                <CardDescription>لا توجد مبيعات اليوم لعرضها.</CardDescription>
            </div>
        )
    }

    return (
        <ChartContainer config={{
            total: {
                label: "المبيعات",
                color: "hsl(var(--primary))",
            },
        }}>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fillSalesByHour" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.1}
                        />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                    <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                        orientation="right"
                        allowDecimals={false}
                    />
                    <Tooltip 
                        content={<ChartTooltipContent formatter={(value) => `${value} ج.م`} />} 
                        cursor={{fill: 'hsl(var(--accent) / 0.5)'}}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#fillSalesByHour)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}
