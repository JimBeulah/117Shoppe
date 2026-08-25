"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { formatPrice } from "@/lib/utils"

interface Props {
  data: { date: string; revenue: number; orders: number }[]
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">No revenue in this range.</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)}
          />
          <Tooltip
            formatter={(value, name) => (name === "revenue" ? formatPrice(Number(value)) : value)}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
