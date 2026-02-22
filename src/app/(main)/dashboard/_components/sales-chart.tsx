
"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface SalesChartProps {
    data: { name: string; total: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-[350px] items-center justify-center">
                <p className="text-muted-foreground">لا توجد بيانات مبيعات لعرض الرسم البياني.</p>
            </div>
        )
    }

    return (
        <ChartContainer config={{
            total: {
                label: "الأرباح",
                color: "hsl(var(--primary))",
            },
        }}>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
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
                        tickFormatter={(value) => `${value} ج.م`}
                    />
                    <Tooltip 
                        content={<ChartTooltipContent formatter={(value) => `${value} ج.م`} />} 
                        cursor={{fill: 'hsl(var(--accent) / 0.5)'}}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#fillTotal)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}
