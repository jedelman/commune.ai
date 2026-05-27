import type { EnterpriseConfig, EnterpriseResult, NodeConfig, NodeResult } from "../lib/model";
import { money } from "../lib/model";
import { Field } from "./Field";

interface Props {
  node: NodeConfig;
  enterprise: EnterpriseConfig;
  enterpriseResult: EnterpriseResult | null;
  laborFloor: number;
  result: NodeResult | null;
  onNode: (patch: Partial<NodeConfig>) => void;
  onEnterprise: (patch: Partial<EnterpriseConfig>) => void;
  onLaborFloor: (v: number) => void;
}

export function NodePanel({ node, enterprise, enterpriseResult, laborFloor, result, onNode, onEnterprise, onLaborFloor }: Props) {
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
      <Field label="Building share (depreciable)" value={node.building_share} min={0.5} max={0.95} step={0.01} kind="percent" onChange={(v) => onNode({ building_share: v })} />

      <div className="group-label">Enterprise recapture (restaurant)</div>
      <p className="muted small">
        Not a markup — the extraction the business stops paying (Square, MCA lenders, QuickBooks).
      </p>
      <Field label="Annual card volume" value={enterprise.annual_card_volume} min={0} max={2_000_000} step={50_000} onChange={(v) => onEnterprise({ annual_card_volume: v })} hint={`Saved: ${money((enterprise.processor_rate - enterprise.at_cost_rate) * enterprise.annual_card_volume)} (3% → 0.9%)`} />
      <Field label="Working capital borrowed" value={enterprise.working_capital} min={0} max={300_000} step={5_000} onChange={(v) => onEnterprise({ working_capital: v })} hint={`Saved: ${money((enterprise.mca_apr - enterprise.member_pool_apr) * enterprise.working_capital)} (50% APR → 6% pool)`} />
      <Field label="Procurement savings (soft)" value={enterprise.procurement_savings} min={0} max={40_000} step={1_000} onChange={(v) => onEnterprise({ procurement_savings: v })} hint="Baseload-demand discounts — the dial-down knob." />
      {enterpriseResult && (
        <div className="summary-row total pos">
          <span>Total recapture</span><b>{money(enterpriseResult.total_recapture)}</b>
        </div>
      )}

      <div className="group-label">Federation knob</div>
      <Field label="Labor credit floor (CC / hr)" value={laborFloor} min={10} max={60} step={1} kind="int" onChange={onLaborFloor} hint="Egalitarian floor: 1:1 with care work. Lower = more commune, higher = more market." />

      {result && (
        <div className="summary">
          <div className="summary-row"><span>Annual carry</span><b>{money(result.carry_total)}</b></div>
          <div className="summary-row"><span>Rental + commercial income</span><b>{money(result.income_total)}</b></div>
          <div className="summary-row neg">
            <span>Asset-layer net</span><b>{money(result.asset_layer_net)}</b>
          </div>
          <div className="summary-row"><span>+ Enterprise recapture</span><b>{money(enterpriseResult?.total_recapture ?? 0)}</b></div>
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
