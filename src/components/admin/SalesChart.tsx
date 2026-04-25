"use client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Point = { date: string; revenue: number; orders: number };

export default function SalesChart({ data }: { data: Point[] }) {
  const formatKR = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="일별 매출 (최근 30일)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`} />
            <Tooltip
              formatter={(v: number) => [formatKR(v) + "원", "매출"]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#1e6fdc" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="일별 주문 건수 (최근 30일)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(v: number) => [v + "건", "주문수"]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="orders" fill="#ff6a3d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded border border-gray-200 p-4">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {children}
    </section>
  );
}
