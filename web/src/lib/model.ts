// TypeScript mirrors of the Rust engine's serde types, plus the default "Node #1" scenario,
// the worked personas, and URL-encoded sharing. Keep field names in sync with model/src/lib.rs.

export interface NodeConfig {
  purchase_price: number;
  renovation: number;
  member_bonds: number;
  bond_rate: number;
  member_equity: number;
  mortgage_rate: number;
  mortgage_term_years: number;
  units: number;
  internal_rent_monthly: number;
  commercial_rent_monthly: number;
  tax_ins_maint: number;
  enterprise_recapture: number;
  building_share: number;
}

export interface NodeResult {
  mortgage_principal: number;
  mortgage_annual: number;
  bond_interest: number;
  carry_total: number;
  residential_income: number;
  commercial_income: number;
  income_total: number;
  asset_layer_net: number;
  node_net_with_enterprise: number;
  annual_depreciation: number;
}

export type PersonaKind =
  | "mature_couple"
  | "young_professional"
  | "young_family"
  | "service_worker"
  | "restaurant_owner";

export interface PersonaInput {
  kind: PersonaKind;
  current_housing_monthly: number;
  income_annual: number;
  home_equity: number;
  childcare_monthly: number;
  labor_hours_monthly: number;
  business_bleed_annual: number;
}

export interface PersonaParams {
  internal_rent_monthly: number;
  bond_rate: number;
  labor_credit_per_hour: number;
}

export interface PersonaLine {
  label: string;
  before: number;
  after: number;
}

export interface PersonaResult {
  kind: string;
  lines: PersonaLine[];
  before_total: number;
  after_total: number;
  net_annual: number;
  equity_built_annual: number;
  note: string;
}

// The worked example — see power-explained/commune-ai/SETUP.md §2 and the design sessions.
export const NODE_ONE: NodeConfig = {
  purchase_price: 2_000_000,
  renovation: 300_000,
  member_bonds: 700_000,
  bond_rate: 0.05,
  member_equity: 200_000,
  mortgage_rate: 0.065,
  mortgage_term_years: 30,
  units: 8,
  internal_rent_monthly: 1_200,
  commercial_rent_monthly: 3_000,
  tax_ins_maint: 56_000,
  enterprise_recapture: 62_000,
  building_share: 0.8,
};

export const DEFAULT_PERSONAS: PersonaInput[] = [
  {
    kind: "mature_couple",
    current_housing_monthly: 1_200, // owner carry on a paid-down house (tax/ins/maint)
    income_annual: 70_000,
    home_equity: 700_000,
    childcare_monthly: 0,
    labor_hours_monthly: 8,
    business_bleed_annual: 0,
  },
  {
    kind: "young_professional",
    current_housing_monthly: 2_100,
    income_annual: 85_000,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 4,
    business_bleed_annual: 0,
  },
  {
    kind: "young_family",
    current_housing_monthly: 2_400,
    income_annual: 110_000,
    home_equity: 0,
    childcare_monthly: 1_600,
    labor_hours_monthly: 6,
    business_bleed_annual: 0,
  },
  {
    kind: "service_worker",
    current_housing_monthly: 1_500,
    income_annual: 38_000,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 20,
    business_bleed_annual: 0,
  },
  {
    kind: "restaurant_owner",
    current_housing_monthly: 1_800,
    income_annual: 60_000,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 0,
    business_bleed_annual: 62_000,
  },
];

// labor_credit_per_hour is a federation knob (the egalitarian floor), tunable in the UI.
export const DEFAULT_LABOR_FLOOR = 25;

export interface Scenario {
  node: NodeConfig;
  personas: PersonaInput[];
  laborFloor: number;
}

export const DEFAULT_SCENARIO: Scenario = {
  node: NODE_ONE,
  personas: DEFAULT_PERSONAS,
  laborFloor: DEFAULT_LABOR_FLOOR,
};

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const money = (n: number): string => fmt.format(Math.round(n));

// ─── URL-encoded sharing (zero backend; D1 gallery is v1.5) ───

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeScenario(s: Scenario): string {
  return toBase64Url(JSON.stringify(s));
}

export function decodeScenario(hash: string): Scenario | null {
  const raw = hash.replace(/^#s=/, "");
  if (!raw || !hash.startsWith("#s=")) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    if (!parsed?.node || !Array.isArray(parsed?.personas)) return null;
    return parsed as Scenario;
  } catch {
    return null;
  }
}
