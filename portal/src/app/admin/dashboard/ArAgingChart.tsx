"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#0891b2", "#06b6d4", "#b06a1f", "#b4451f", "#7a1f1f"];

export function ArAgingChart({ data }: { data: { bucket: string; total: number }[] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#9a978d" tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#9a978d"
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          <Tooltip
            cursor={{ fill: "rgba(6,182,212,0.06)" }}
            formatter={(v) => Number(v).toLocaleString()}
            labelStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
