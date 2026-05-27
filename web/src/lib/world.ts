// Client-side mirror of the shared world document (model/src/lib.rs + worker/src/types.ts)
// and the WorldEval the WASM engine returns. Plus a small WebSocket hook.

import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeResult, PersonaInput, PersonaKind, PersonaResult } from "./model";

export interface Governance {
  internal_rent_monthly: number;
  bond_rate: number;
  mortgage_rate: number;
  commercial_rent_monthly: number;
  compression_floor: number;
  compression_cap_mult: number;
  demurrage_rate: number;
}

export interface WorldNode {
  id: string;
  name: string;
  config: Record<string, number>;
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

export interface Proposal {
  id: string;
  kind: "jubilee";
  debtor: string;
  node_id: string;
  votes: string[];
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
}

export type Roles = Record<string, string>;

export interface NodeEval {
  id: string;
  name: string;
  members: number;
  committed_bonds: number;
  committed_equity: number;
  node_result: NodeResult;
  clears: boolean;
  quota: number;
  clearing_balance: number;
  carrying_charge: number;
  pool_balance: number;
}

export interface PlayerEval {
  id: string;
  handle: string;
  node_id: string;
  persona: PersonaResult;
  cc_balance: number;
  demurrage: number;
}

export interface SystemStats {
  members: number;
  nodes: number;
  nodes_clearing: number;
  period: number;
  tx_count: number;
  reserve: number;
  total_credit: number;
  total_debt: number;
  melted_demurrage: number;
  demurrage_per_yr: number;
  committed_bonds: number;
  committed_equity: number;
  total_mortgage: number;
  aggregate_node_net: number;
}

export interface WorldEval {
  nodes: NodeEval[];
  players: PlayerEval[];
  reserve: number;
  carrying_charges: number;
  federation_clears: boolean;
  period: number;
  system: SystemStats;
}

export const PERSONA_LABELS: Record<PersonaKind, string> = {
  mature_couple: "Mature couple",
  young_professional: "Young professional",
  young_family: "Young family",
  service_worker: "Service worker",
  restaurant_owner: "Restaurant owner",
};

export const PERSONA_TEMPLATES: Record<PersonaKind, PersonaInput> = {
  mature_couple: { kind: "mature_couple", current_housing_monthly: 1_200, home_equity: 700_000, childcare_monthly: 0, labor_hours_monthly: 8, business_bleed_annual: 0 },
  young_professional: { kind: "young_professional", current_housing_monthly: 2_100, home_equity: 0, childcare_monthly: 0, labor_hours_monthly: 4, business_bleed_annual: 0 },
  young_family: { kind: "young_family", current_housing_monthly: 2_400, home_equity: 0, childcare_monthly: 1_600, labor_hours_monthly: 6, business_bleed_annual: 0 },
  service_worker: { kind: "service_worker", current_housing_monthly: 1_500, home_equity: 0, childcare_monthly: 0, labor_hours_monthly: 20, business_bleed_annual: 0 },
  restaurant_owner: { kind: "restaurant_owner", current_housing_monthly: 1_800, home_equity: 0, childcare_monthly: 0, labor_hours_monthly: 0, business_bleed_annual: 62_000 },
};

export type OutMsg =
  | { t: "join"; node_id: string; persona: PersonaInput; equity_buyin: number }
  | { t: "setPersona"; persona: PersonaInput; equity_buyin?: number; node_id?: string }
  | { t: "claim"; role: "capital_stack" | "federation"; node_id?: string }
  | { t: "release"; role: "capital_stack" | "federation"; node_id?: string }
  | { t: "governance"; node_id: string; field: string; value: number }
  | { t: "addNode"; name: string }
  | { t: "labor"; hours: number }
  | { t: "transfer"; to: string; amount: number }
  | { t: "proposeJubilee" }
  | { t: "voteJubilee"; id: string };

const wsBase = import.meta.env.DEV
  ? "ws://localhost:8787"
  : location.origin.replace(/^http/, "ws");

interface WorldState {
  status: "connecting" | "open" | "closed";
  doc: WorldDoc | null;
  roles: Roles;
  pid: string | null;
  error: string | null;
  send: (m: OutMsg) => void;
}

export function useWorld(room: string, pid: string, handle: string): WorldState {
  const [status, setStatus] = useState<WorldState["status"]>("connecting");
  const [doc, setDoc] = useState<WorldDoc | null>(null);
  const [roles, setRoles] = useState<Roles>({});
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = `${wsBase}/ws?room=${encodeURIComponent(room)}&pid=${encodeURIComponent(pid)}&handle=${encodeURIComponent(handle)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === "state") {
        setDoc(m.doc);
        setRoles(m.roles ?? {});
        if (m.you) setMe(m.you);
      } else if (m.t === "error") {
        setError(m.message);
        setTimeout(() => setError(null), 3000);
      }
    };
    return () => ws.close();
  }, [room, pid, handle]);

  const send = useCallback((m: OutMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }, []);

  return { status, doc, roles, pid: me ?? pid, error, send };
}
