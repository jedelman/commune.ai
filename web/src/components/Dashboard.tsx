import { money } from "../lib/model";
import type { Roles, WorldEval } from "../lib/world";

interface Props {
  world: WorldEval;
  roles: Roles;
  handleOf: (id: string) => string;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="tile">
      <span className="lbl">{label}</span>
      <b className={tone ?? ""}>{value}</b>
    </div>
  );
}

export function Dashboard({ world, roles, handleOf }: Props) {
  const s = world.system;
  // Conservation: every transaction nets to zero, so credit ≈ debt. The gap is melted demurrage.
  const conserved = Math.abs(s.total_credit - s.total_debt - -s.melted_demurrage) < 1;

  return (
    <div className="dash">
      <section>
        <h2>System</h2>
        <div className="tiles">
          <Tile label="Federation" value={world.federation_clears ? "solvent" : "under-capitalized"} tone={world.federation_clears ? "pos" : "neg"} />
          <Tile label="Reserve" value={money(s.reserve)} />
          <Tile label="Members" value={String(s.members)} />
          <Tile label="Nodes clearing" value={`${s.nodes_clearing} / ${s.nodes}`} tone={s.nodes_clearing === s.nodes ? "pos" : "neg"} />
          <Tile label="Period (mo)" value={String(s.period)} />
          <Tile label="Ledger entries" value={String(s.tx_count)} />
        </div>
      </section>

      <section>
        <h2>Mutual-credit ledger</h2>
        <div className="tiles">
          <Tile label="Credit (claims)" value={`${money(s.total_credit)} CC`} tone="pos" />
          <Tile label="Debt (obligations)" value={`${money(s.total_debt)} CC`} tone="neg" />
          <Tile label="Melted by demurrage" value={`${money(s.melted_demurrage)} CC`} />
          <Tile label="Demurrage rate" value={`${money(s.demurrage_per_yr)}/yr`} />
        </div>
        <p className="muted small">
          Every transaction nets to zero, so claims and obligations track each other; the gap is idle
          credit burned off by demurrage. {conserved ? "Books reconcile." : "Check: books drifting."}
        </p>
      </section>

      <section>
        <h2>Capital federation <span className="muted small">(member-owned; mortgage is the gap)</span></h2>
        <div className="tiles">
          <Tile label="Federation capital" value={money(s.committed_bonds + s.committed_equity)} tone="pos" />
          <Tile label="Committed bonds" value={money(s.committed_bonds)} />
          <Tile label="Committed equity" value={money(s.committed_equity)} />
          <Tile label="Total mortgage" value={money(s.total_mortgage)} tone="neg" />
          <Tile label="Aggregate node net" value={money(s.aggregate_node_net)} tone={s.aggregate_node_net >= 0 ? "pos" : "neg"} />
        </div>
        <div className="tiles" style={{ marginTop: 12 }}>
          <Tile label="Redemption float" value={money(s.facility_cash)} tone={s.facility_cash > 0 ? "pos" : "neg"} />
          <Tile label="Facility-held capital" value={money(s.facility_capital_held)} />
        </div>
        <p className="muted small">The redemption facility buys exiting stakes (keeping nodes intact) and re-issues them to incoming members. Float gates how much can be redeemed at once.</p>
      </section>

      <section>
        <h2>Nodes</h2>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Node</th><th>Capital stack</th><th>Members</th><th>Bonds</th><th>Equity</th>
              <th>Member cap %</th><th>Mortgage</th><th>Node net</th><th>Pool (CC)</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {world.nodes.map((n) => (
              <tr key={n.id}>
                <td>{n.name}</td>
                <td className="muted">{roles[`${n.id}:capital_stack`] ? handleOf(roles[`${n.id}:capital_stack`]) : "—"}</td>
                <td>{n.members}</td>
                <td>{money(n.committed_bonds)}</td>
                <td>{money(n.committed_equity)}</td>
                <td className={n.capital_ratio >= 0.35 ? "pos" : "neg"}>{Math.round(n.capital_ratio * 100)}%</td>
                <td>{money(n.node_result.mortgage_principal)}</td>
                <td className={n.node_result.node_net_with_enterprise >= 0 ? "pos" : "neg"}>{money(n.node_result.node_net_with_enterprise)}</td>
                <td>{money(n.pool_balance)}</td>
                <td>{n.clears ? <span className="badge ok">clears</span> : <span className="badge warn">needs capital</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Members</h2>
        <table className="dash-table">
          <thead>
            <tr><th>Member</th><th>Persona</th><th>Node</th><th>Bond</th><th>Equity</th><th>Cap share</th><th>CC balance</th><th>Annual net</th></tr>
          </thead>
          <tbody>
            {world.players.map((p) => (
              <tr key={p.id}>
                <td>{p.handle}</td>
                <td className="muted">{p.persona.kind}</td>
                <td className="muted">{world.nodes.find((n) => n.id === p.node_id)?.name ?? p.node_id}</td>
                <td>{money(p.bond_position)}</td>
                <td>{money(p.equity_position)}</td>
                <td>{Math.round(p.capital_share * 100)}%</td>
                <td className={p.cc_balance >= 0 ? "pos" : "neg"}>{money(p.cc_balance)} CC</td>
                <td className={p.persona.net_annual >= 0 ? "pos" : "neg"}>{money(p.persona.net_annual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
