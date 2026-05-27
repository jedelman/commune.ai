import { money } from "../lib/model";
import type { NodeEval, Roles, WorldNode, OutMsg } from "../lib/world";
import { Field } from "./Field";

interface Props {
  node: WorldNode;
  evaluation: NodeEval | undefined;
  roles: Roles;
  pid: string;
  holderHandle: (pid: string) => string;
  send: (m: OutMsg) => void;
}

export function NodeCard({ node, evaluation, roles, pid, holderHandle, send }: Props) {
  const roleKey = `${node.id}:capital_stack`;
  const holder = roles[roleKey];
  const iRun = holder === pid;
  const g = node.governance;

  return (
    <article className={`node ${evaluation?.clears ? "clears" : "fails"}`}>
      <header className="node-head">
        <h3>{node.name}</h3>
        <span className={`badge ${evaluation?.clears ? "ok" : "warn"}`}>
          {evaluation?.clears ? "clears" : "needs capital"}
        </span>
      </header>

      {evaluation && (
        <div className="node-stats">
          <div><span>Members</span><b>{evaluation.members}</b></div>
          <div><span>Committed bonds</span><b>{money(evaluation.committed_bonds)}</b></div>
          <div><span>Committed equity</span><b>{money(evaluation.committed_equity)}</b></div>
          <div><span>Mortgage</span><b>{money(evaluation.node_result.mortgage_principal)}</b></div>
          <div className={evaluation.node_result.node_net_with_enterprise >= 0 ? "pos" : "neg"}>
            <span>Node net</span><b>{money(evaluation.node_result.node_net_with_enterprise)}</b>
          </div>
          <div className={evaluation.carrying_charge > 0 ? "neg" : ""}>
            <span>Clearing charge</span><b>{money(evaluation.carrying_charge)}</b>
          </div>
        </div>
      )}

      <div className="role-row">
        <span className="muted">
          Capital stack: <b>{holder ? holderHandle(holder) : "unclaimed"}</b>
        </span>
        {iRun ? (
          <button className="ghost" onClick={() => send({ t: "release", role: "capital_stack", node_id: node.id })}>release</button>
        ) : !holder ? (
          <button className="ghost" onClick={() => send({ t: "claim", role: "capital_stack", node_id: node.id })}>claim role</button>
        ) : null}
      </div>

      <div className={`gov ${iRun ? "" : "locked"}`}>
        <Field label="Internal rent / mo" value={g.internal_rent_monthly} min={200} max={3_000} step={50} disabled={!iRun} onChange={(v) => send({ t: "governance", node_id: node.id, field: "internal_rent_monthly", value: v })} />
        <Field label="Commercial rent / mo" value={g.commercial_rent_monthly} min={0} max={12_000} step={250} disabled={!iRun} onChange={(v) => send({ t: "governance", node_id: node.id, field: "commercial_rent_monthly", value: v })} />
        <Field label="Bond rate" value={g.bond_rate} min={0} max={0.12} step={0.005} kind="percent" disabled={!iRun} onChange={(v) => send({ t: "governance", node_id: node.id, field: "bond_rate", value: v })} />
        <Field label="Mortgage rate" value={g.mortgage_rate} min={0} max={0.12} step={0.0025} kind="percent" disabled={!iRun} onChange={(v) => send({ t: "governance", node_id: node.id, field: "mortgage_rate", value: v })} />
      </div>
    </article>
  );
}
