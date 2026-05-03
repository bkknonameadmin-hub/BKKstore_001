"use client";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Point = { date: string; revenue: number; orders: number };

export default function RevenueChart({ data }: { data: Point[] }) {
  const formatKR = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
  const yAxisFormat = (v: number) => v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`;

  return (
    <section className="bg-white rounded border border-gray-200 p-4">
      <h3 className="font-bold text-sm mb-3">기간 내 일별 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={yAxisFormat} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === "순매출" ? [formatKR(v) + "원", name] : [v + "건", name]
            }
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="revenue" name="순매출" fill="#1e6fdc" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="orders" name="주문수" stroke="#ff6a3d" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
