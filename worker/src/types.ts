// Mirrors model/src/lib.rs WorldDoc — the single shared document the engine evaluates.
// Keep these in sync with the Rust serde structs and web/src/lib/model.ts.

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

export interface NodeConfig {
  purchase_price: number;
  renovation: number;
  member_bonds: number; // derived from players at eval time
  bond_rate: number;
  member_equity: number; // derived from players at eval time
  mortgage_rate: number;
  mortgage_term_years: number;
  units: number;
  internal_rent_monthly: number;
  commercial_rent_monthly: number;
  tax_ins_maint: number;
  enterprise_recapture: number;
  building_share: number;
}

export interface Governance {
  internal_rent_monthly: number; // capital-stack role
  bond_rate: number; // capital-stack role
  mortgage_rate: number; // capital-stack role
  commercial_rent_monthly: number; // capital-stack role
  compression_floor: number; // federation role
  compression_cap_mult: number; // federation role
  demurrage_rate: number; // federation role
}

export interface WorldNode {
  id: string;
  name: string;
  config: NodeConfig;
  governance: Governance;
}

export interface WorldPlayer {
  id: string;
  handle: string;
  node_id: string;
  persona: PersonaInput;
  equity_buyin: number;
  cc_balance: number;
}

export interface ClearingBands {
  band1: number;
  rate1: number;
  band2: number;
  rate2: number;
}

export interface Tx {
  ts_ms: number;
  from: string;
  to: string;
  amount: number;
}

export interface FacilityHolding {
  node_id: string;
  amount: number;
}

// A collective ledger action: the debtor requests it, node members vote, the node pool bears it.
export interface Proposal {
  id: string;
  kind: "jubilee";
  debtor: string; // player id
  node_id: string;
  votes: string[]; // ids of node members (≠ debtor) who approve
  created_ms: number;
}

export interface WorldDoc {
  nodes: WorldNode[];
  players: WorldPlayer[];
  reserve: number;
  bands: ClearingBands;
  txs: Tx[];
  period: number;
  proposals: Proposal[];
  facility: number;
  facility_holdings: FacilityHolding[];
}

// roles map: `${nodeId}:capital_stack` -> playerId, and `federation` -> playerId
export type Roles = Record<string, string>;

// Which governance fields each role may write.
export const CAPITAL_STACK_FIELDS = [
  "internal_rent_monthly",
  "bond_rate",
  "mortgage_rate",
  "commercial_rent_monthly",
] as const;
export const FEDERATION_FIELDS = [
  "compression_floor",
  "compression_cap_mult",
  "demurrage_rate",
] as const;
