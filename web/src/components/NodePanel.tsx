import type { NodeConfig, NodeResult } from "../lib/model";
import { money } from "../lib/model";
import { Field } from "./Field";

interface Props {
  node: NodeConfig;
  laborFloor: number;
  result: NodeResult | null;
  onNode: (patch: Partial<NodeConfig>) => void;
  onLaborFloor: (v: number) => void;
}

export function NodePanel({ node, laborFloor, result, onNode, onLaborFloor }: Props) {
  return (
    <section className="panel">
      <h2>Node #1</h2>
      <p className="muted">
        One building. The asset layer runs negative on purpose — below-market rents don't carry the
        mortgage. The enterprise layer is what tips it positive.
      </p>

      <div className="group-label">Capital stack</div>
      <Field label="Purchase price" value={node.purchase_price} min={500_000} max={5_000_000} step={50_000} onChange={(v) => onNode({ purchase_price: v })} />
      <Field label="Renovation" value={node.renovation} min={0} max={1_000_000} step={25_000} onChange={(v) => onNode({ renovation: v })} />
      <Field label="Member bonds (home equity in)" value={node.member_bonds} min={0} max={2_000_000} step={50_000} onChange={(v) => onNode({ member_bonds: v })} />
      <Field label="Bond rate" value={node.bond_rate} min={0} max={0.1} step={0.005} kind="percent" onChange={(v) => onNode({ bond_rate: v })} />
      <Field label="Member equity (limited-equity shares)" value={node.member_equity} min={0} max={1_000_000} step={25_000} onChange={(v) => onNode({ member_equity: v })} />
      <Field label="Mortgage rate" value={node.mortgage_rate} min={0} max={0.12} step={0.0025} kind="percent" onChange={(v) => onNode({ mortgage_rate: v })} />

      <div className="group-label">Operations (annual / monthly)</div>
      <Field label="Units" value={node.units} min={1} max={40} step={1} kind="int" onChange={(v) => onNode({ units: v })} />
      <Field label="Internal rent / unit / month" value={node.internal_rent_monthly} min={400} max={3_000} step={50} onChange={(v) => onNode({ internal_rent_monthly: v })} hint="Below market — that's the point." />
      <Field label="Commercial rent / month" value={node.commercial_rent_monthly} min={0} max={12_000} step={250} onChange={(v) => onNode({ commercial_rent_monthly: v })} />
      <Field label="Tax / insurance / maintenance" value={node.tax_ins_maint} min={0} max={150_000} step={2_000} onChange={(v) => onNode({ tax_ins_maint: v })} />
      <Field label="Enterprise recapture (restaurant)" value={node.enterprise_recapture} min={0} max={150_000} step={2_000} onChange={(v) => onNode({ enterprise_recapture: v })} hint="Margin recaptured by not paying Square / MCA / QuickBooks." />
      <Field label="Building share (depreciable)" value={node.building_share} min={0.5} max={0.95} step={0.01} kind="percent" onChange={(v) => onNode({ building_share: v })} />

      <div className="group-label">Federation knob</div>
      <Field label="Labor credit floor (CC / hr)" value={laborFloor} min={10} max={60} step={1} kind="int" onChange={onLaborFloor} hint="Egalitarian floor: 1:1 with care work. Lower = more commune, higher = more market." />

      {result && (
        <div className="summary">
          <div className="summary-row"><span>Annual carry</span><b>{money(result.carry_total)}</b></div>
          <div className="summary-row"><span>Rental + commercial income</span><b>{money(result.income_total)}</b></div>
          <div className="summary-row neg">
            <span>Asset-layer net</span><b>{money(result.asset_layer_net)}</b>
          </div>
          <div className="summary-row"><span>+ Enterprise recapture</span><b>{money(node.enterprise_recapture)}</b></div>
          <div className={`summary-row total ${result.node_net_with_enterprise >= 0 ? "pos" : "neg"}`}>
            <span>Node net</span><b>{money(result.node_net_with_enterprise)}</b>
          </div>
          <div className="summary-row muted-row">
            <span>Depreciation paper loss</span><b>{money(result.annual_depreciation)}</b>
          </div>
        </div>
      )}
    </section>
  );
}
