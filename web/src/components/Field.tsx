type Kind = "money" | "percent" | "int";

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  kind?: Kind;
  hint?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

function display(value: number, kind: Kind): string {
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  if (kind === "int") return String(Math.round(value));
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function Field({ label, value, min, max, step, kind = "money", hint, disabled, onChange }: FieldProps) {
  return (
    <label className={`field${disabled ? " field-disabled" : ""}`}>
      <span className="field-head">
        <span className="field-label">{label}</span>
        <span className="field-value">{display(value, kind)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
