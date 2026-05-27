import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "../lib/model";

interface Props {
  beforeTotal: number;
  afterTotal: number;
  better: boolean;
}

// Pulled into its own module so recharts is code-split out of the initial bundle.
export default function BeforeAfterChart({ beforeTotal, afterTotal, better }: Props) {
  const data = [
    { name: "Now", value: Math.round(beforeTotal) },
    { name: "In the commune", value: Math.round(afterTotal) },
  ];
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis hide />
        <ReferenceLine y={0} stroke="#888" />
        <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          <Cell fill="#b4543a" />
          <Cell fill={better ? "#2f7d54" : "#b4543a"} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
