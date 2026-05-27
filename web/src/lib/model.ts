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

export interface EnterpriseConfig {
  annual_card_volume: number;
  processor_rate: number;
  at_cost_rate: number;
  working_capital: number;
  mca_apr: number;
  member_pool_apr: number;
  bookkeeping_saved: number;
  procurement_savings: number;
}

export interface EnterpriseResult {
  card_processing_saved: number;
  working_capital_saved: number;
  bookkeeping_saved: number;
  procurement_savings: number;
  total_recapture: number;
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
    home_equity: 700_000,
    childcare_monthly: 0,
    labor_hours_monthly: 8,
    business_bleed_annual: 0,
  },
  {
    kind: "young_professional",
    current_housing_monthly: 2_100,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 4,
    business_bleed_annual: 0,
  },
  {
    kind: "young_family",
    current_housing_monthly: 2_400,
    home_equity: 0,
    childcare_monthly: 1_600,
    labor_hours_monthly: 6,
    business_bleed_annual: 0,
  },
  {
    kind: "service_worker",
    current_housing_monthly: 1_500,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 20,
    business_bleed_annual: 0,
  },
  {
    kind: "restaurant_owner",
    current_housing_monthly: 1_800,
    home_equity: 0,
    childcare_monthly: 0,
    labor_hours_monthly: 0,
    business_bleed_annual: 62_000,
  },
];

// Defaults sum to the worked $62k recapture. The recapture isn't a markup — it's the extraction
// the business stops paying (Square, MCA lenders, QuickBooks). Procurement is the soft dial.
export const DEFAULT_ENTERPRISE: EnterpriseConfig = {
  annual_card_volume: 800_000,
  processor_rate: 0.03,
  at_cost_rate: 0.009,
  working_capital: 60_000,
  mca_apr: 0.5,
  member_pool_apr: 0.06,
  bookkeeping_saved: 6_000,
  procurement_savings: 12_800,
};

// labor_credit_per_hour is a federation knob (the egalitarian floor), tunable in the UI.
export const DEFAULT_LABOR_FLOOR = 25;

export interface Scenario {
  node: NodeConfig;
  enterprise: EnterpriseConfig;
  personas: PersonaInput[];
  laborFloor: number;
}

export const DEFAULT_SCENARIO: Scenario = {
  node: NODE_ONE,
  enterprise: DEFAULT_ENTERPRISE,
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
    // Backfill fields added after early share-links were created.
    return {
      node: { ...NODE_ONE, ...parsed.node },
      enterprise: { ...DEFAULT_ENTERPRISE, ...(parsed.enterprise ?? {}) },
      personas: parsed.personas,
      laborFloor: parsed.laborFloor ?? DEFAULT_LABOR_FLOOR,
    };
  } catch {
    return null;
  }
}
