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

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const money = (n: number): string => fmt.format(Math.round(n));
