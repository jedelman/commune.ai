import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PersonaInput, PersonaResult } from "../lib/model";
import { money } from "../lib/model";

interface Props {
  input: PersonaInput;
  result: PersonaResult;
  onChange: (patch: Partial<PersonaInput>) => void;
}

function NumInput({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="num">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PersonaCard({ input, result, onChange }: Props) {
  const better = result.net_annual >= 0;
  const chartData = [
    { name: "Now", value: Math.round(result.before_total) },
    { name: "In the commune", value: Math.round(result.after_total) },
  ];

  return (
    <article className="persona">
      <header>
        <h3>{result.kind}</h3>
        <p className="muted">{result.note}</p>
      </header>

      <div className={`net ${better ? "pos" : "neg"}`}>
        <span className="net-num">{money(Math.abs(result.net_annual))}/yr</span>
        <span className="net-word">{better ? "better off" : "worse off"}</span>
      </div>
      {result.equity_built_annual > 0 && (
        <div className="equity">+ {money(result.equity_built_annual)}/yr building portable equity</div>
      )}

      <div className="chart" aria-label="annual outlay, now vs in the commune">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
        <div className="chart-cap muted">annual housing + care outlay (lower is better)</div>
      </div>

      <table className="lines">
        <thead>
          <tr><th>Line</th><th>Now</th><th>Commune</th></tr>
        </thead>
        <tbody>
          {result.lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td>{money(l.before)}</td>
              <td>{money(l.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="persona-inputs">
        <NumInput label="Your rent / carry now ($/mo)" value={input.current_housing_monthly} step={50} onChange={(v) => onChange({ current_housing_monthly: v })} />
        <NumInput label="Hours you'd contribute (hrs/mo)" value={input.labor_hours_monthly} step={1} onChange={(v) => onChange({ labor_hours_monthly: v })} />
        {input.kind === "mature_couple" && (
          <NumInput label="Home equity you'd roll in ($)" value={input.home_equity} step={10_000} onChange={(v) => onChange({ home_equity: v })} />
        )}
        {input.kind === "young_family" && (
          <NumInput label="Childcare now ($/mo)" value={input.childcare_monthly} step={50} onChange={(v) => onChange({ childcare_monthly: v })} />
        )}
        {input.kind === "restaurant_owner" && (
          <NumInput label="Extraction bleed now ($/yr)" value={input.business_bleed_annual} step={1_000} onChange={(v) => onChange({ business_bleed_annual: v })} />
        )}
      </div>
    </article>
  );
}
