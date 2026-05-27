//! commune.ai financial engine.
//!
//! One validated core, compiled to WASM for the browser and run natively under `cargo test`.
//! Layers, in the order a node is built up:
//!   1. asset layer    — the building's capital stack + carry vs. below-market rents (negative)
//!   2. enterprise     — restaurant margin recaptured by internalizing extraction (tips it positive)
//!   3. trades co-op   — export sector: cheaper renos + external surplus + federation solidarity
//!   4. tax            — depreciation paper-loss ("the SMB owner thing")
//!   5. personas       — the hero output: each member's own life, before vs. after

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ───────────────────────────── 1. Asset layer ─────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct NodeConfig {
    pub purchase_price: f64,      // 2_000_000
    pub renovation: f64,          // 300_000
    pub member_bonds: f64,        // 700_000  (mature-couple home equity)
    pub bond_rate: f64,           // 0.05
    pub member_equity: f64,       // 200_000  (limited-equity shares)
    pub mortgage_rate: f64,       // 0.065
    pub mortgage_term_years: u32, // 30
    pub units: u32,               // 8
    pub internal_rent_monthly: f64,     // 1_200
    pub commercial_rent_monthly: f64,   // 3_000
    pub tax_ins_maint: f64,             // 56_000  (annual)
    pub enterprise_recapture: f64,      // 62_000  (restaurant: see EnterpriseConfig)
    pub building_share: f64,            // 0.80  (depreciable fraction)
}

#[derive(Serialize, Deserialize)]
pub struct NodeResult {
    pub mortgage_principal: f64,
    pub mortgage_annual: f64,
    pub bond_interest: f64,
    pub carry_total: f64,
    pub residential_income: f64,
    pub commercial_income: f64,
    pub income_total: f64,
    pub asset_layer_net: f64,      // negative = needs the enterprise layer
    pub node_net_with_enterprise: f64,
    pub annual_depreciation: f64,  // the "SMB owner" paper loss
}

fn annual_mortgage_payment(principal: f64, annual_rate: f64, years: u32) -> f64 {
    if principal <= 0.0 {
        return 0.0;
    }
    let r = annual_rate / 12.0;
    let n = (years * 12) as f64;
    let m = principal * r * (1.0 + r).powf(n) / ((1.0 + r).powf(n) - 1.0);
    m * 12.0
}

pub fn compute(cfg: &NodeConfig) -> NodeResult {
    let project = cfg.purchase_price + cfg.renovation;
    let mortgage_principal = project - cfg.member_bonds - cfg.member_equity;
    let mortgage_annual =
        annual_mortgage_payment(mortgage_principal, cfg.mortgage_rate, cfg.mortgage_term_years);
    let bond_interest = cfg.member_bonds * cfg.bond_rate;
    let carry_total = mortgage_annual + bond_interest + cfg.tax_ins_maint;

    let residential_income = cfg.units as f64 * cfg.internal_rent_monthly * 12.0;
    let commercial_income = cfg.commercial_rent_monthly * 12.0;
    let income_total = residential_income + commercial_income;

    let asset_layer_net = income_total - carry_total;
    let node_net_with_enterprise = asset_layer_net + cfg.enterprise_recapture;
    let annual_depreciation = cfg.purchase_price * cfg.building_share / 27.5;

    NodeResult {
        mortgage_principal,
        mortgage_annual,
        bond_interest,
        carry_total,
        residential_income,
        commercial_income,
        income_total,
        asset_layer_net,
        node_net_with_enterprise,
        annual_depreciation,
    }
}

#[wasm_bindgen]
pub fn compute_node(config: JsValue) -> Result<JsValue, JsValue> {
    let cfg: NodeConfig = serde_wasm_bindgen::from_value(config)?;
    Ok(serde_wasm_bindgen::to_value(&compute(&cfg))?)
}

// ───────────────────────────── 2. Enterprise layer ─────────────────────────────
// The restaurant doesn't earn the recapture by charging more — it earns it by NOT paying
// the rentiers (Square, MCA lenders, QuickBooks). Each component is the spread between the
// extractive rate and the at-cost / member-pool rate. Procurement is a soft dial.

#[derive(Serialize, Deserialize, Clone)]
pub struct EnterpriseConfig {
    pub annual_card_volume: f64, // 800_000  card sales run through processing
    pub processor_rate: f64,     // 0.030    Square-style effective rate
    pub at_cost_rate: f64,       // 0.009    interchange-plus at cost
    pub working_capital: f64,    // 60_000   short-term capital the business needs
    pub mca_apr: f64,            // 0.50     merchant cash advance effective APR
    pub member_pool_apr: f64,    // 0.06     internal member-bond pool rate
    pub bookkeeping_saved: f64,  // 6_000    QuickBooks/TurboTax rent → ledger byproduct
    pub procurement_savings: f64,// 12_800   baseload-demand discounts (soft — dial down)
}

#[derive(Serialize, Deserialize)]
pub struct EnterpriseResult {
    pub card_processing_saved: f64,
    pub working_capital_saved: f64,
    pub bookkeeping_saved: f64,
    pub procurement_savings: f64,
    pub total_recapture: f64,
}

pub fn compute_enterprise(c: &EnterpriseConfig) -> EnterpriseResult {
    let card_processing_saved = c.annual_card_volume * (c.processor_rate - c.at_cost_rate);
    let working_capital_saved = c.working_capital * (c.mca_apr - c.member_pool_apr);
    let total_recapture =
        card_processing_saved + working_capital_saved + c.bookkeeping_saved + c.procurement_savings;
    EnterpriseResult {
        card_processing_saved,
        working_capital_saved,
        bookkeeping_saved: c.bookkeeping_saved,
        procurement_savings: c.procurement_savings,
        total_recapture,
    }
}

#[wasm_bindgen]
pub fn compute_enterprise_layer(config: JsValue) -> Result<JsValue, JsValue> {
    let cfg: EnterpriseConfig = serde_wasm_bindgen::from_value(config)?;
    Ok(serde_wasm_bindgen::to_value(&compute_enterprise(&cfg))?)
}

// ───────────────────────────── 3. Trades co-op (export sector) ─────────────────────────────
// Tradespeople OWN the co-op; the node does NOT capture the external surplus. Modelled as
// careers + cheaper commons + a solidarity contribution to the federation reserve — not a
// subsidy to the rent roll.

#[derive(Serialize, Deserialize, Clone)]
pub struct TradesConfig {
    pub reno_cost: f64,        // 300_000  in-house cost of a renovation
    pub market_markup: f64,    // 0.30     GC markup avoided
    pub member_markup: f64,    // 0.10     co-op markup at cost+
    pub external_gross: f64,   // 750_000  external contracting revenue
    pub external_margin: f64,  // 0.10     thin co-op net margin
    pub solidarity_rate: f64,  // 0.10     share of surplus to federation reserve
    pub field_workers: u32,    // 5        living-wage ladder seats
}

#[derive(Serialize, Deserialize)]
pub struct TradesResult {
    pub reno_savings: f64,            // built ~this much cheaper per acquisition
    pub external_surplus: f64,        // owned by the co-op members
    pub solidarity_contribution: f64, // → federation reserve
    pub field_worker_jobs: u32,
}

pub fn compute_trades(c: &TradesConfig) -> TradesResult {
    let reno_savings = c.reno_cost * (c.market_markup - c.member_markup);
    let external_surplus = c.external_gross * c.external_margin;
    let solidarity_contribution = external_surplus * c.solidarity_rate;
    TradesResult {
        reno_savings,
        external_surplus,
        solidarity_contribution,
        field_worker_jobs: c.field_workers,
    }
}

#[wasm_bindgen]
pub fn compute_trades_layer(config: JsValue) -> Result<JsValue, JsValue> {
    let cfg: TradesConfig = serde_wasm_bindgen::from_value(config)?;
    Ok(serde_wasm_bindgen::to_value(&compute_trades(&cfg))?)
}

// ───────────────────────────── 4. Tax layer ─────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct TaxConfig {
    pub purchase_price: f64,  // 2_000_000
    pub building_share: f64,  // 0.80
    pub marginal_rate: f64,   // 0.30  member's marginal rate
}

#[derive(Serialize, Deserialize)]
pub struct TaxResult {
    pub annual_depreciation: f64, // paper loss
    pub paper_loss_benefit: f64,  // depreciation × marginal rate (PAL §469 caveat in UI)
}

pub fn compute_tax(c: &TaxConfig) -> TaxResult {
    let annual_depreciation = c.purchase_price * c.building_share / 27.5;
    TaxResult {
        annual_depreciation,
        paper_loss_benefit: annual_depreciation * c.marginal_rate,
    }
}

#[wasm_bindgen]
pub fn compute_tax_layer(config: JsValue) -> Result<JsValue, JsValue> {
    let cfg: TaxConfig = serde_wasm_bindgen::from_value(config)?;
    Ok(serde_wasm_bindgen::to_value(&compute_tax(&cfg))?)
}

// ───────────────────────────── 5. Personas (the hero output) ─────────────────────────────
// Every line is an annual dollar amount where positive = money out, negative = money in. So
// `net_annual = before_total − after_total` is the member's annual improvement (positive = better
// off). `equity_built_annual` is a stock accrual reported separately from the cash flow.

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum PersonaKind {
    MatureCouple,
    YoungProfessional,
    YoungFamily,
    ServiceWorker,
    RestaurantOwner,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PersonaInput {
    pub kind: PersonaKind,
    pub current_housing_monthly: f64,  // rent, or owner carry (tax+ins+maint+P&I) now
    pub home_equity: f64,              // mature couple: rolled into a member bond
    pub childcare_monthly: f64,        // young family
    pub labor_hours_monthly: f64,      // hours contributed, credited at the floor
    pub business_bleed_annual: f64,    // restaurant owner: current extraction bleed
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PersonaParams {
    pub internal_rent_monthly: f64,    // from the node
    pub bond_rate: f64,
    pub labor_credit_per_hour: f64,    // 25 CC/hr egalitarian floor
}

#[derive(Serialize, Deserialize)]
pub struct PersonaLine {
    pub label: String,
    pub before: f64,
    pub after: f64,
}

#[derive(Serialize, Deserialize)]
pub struct PersonaResult {
    pub kind: String,
    pub lines: Vec<PersonaLine>,
    pub before_total: f64,
    pub after_total: f64,
    pub net_annual: f64,
    pub equity_built_annual: f64,
    pub note: String,
}

fn line(label: &str, before: f64, after: f64) -> PersonaLine {
    PersonaLine { label: label.to_string(), before, after }
}

pub fn compute_persona(p: &PersonaInput, n: &PersonaParams) -> PersonaResult {
    let internal_rent = n.internal_rent_monthly * 12.0;
    let current_housing = p.current_housing_monthly * 12.0;
    let labor_credit = p.labor_hours_monthly * 12.0 * n.labor_credit_per_hour;

    let mut lines: Vec<PersonaLine> = Vec::new();
    let mut equity_built_annual = 0.0;
    let kind;
    let note;

    match p.kind {
        PersonaKind::MatureCouple => {
            kind = "Mature couple";
            // Equity that was dead in the house becomes a member bond that yields.
            let yield_now = p.home_equity * n.bond_rate;
            lines.push(line("Housing", current_housing, internal_rent));
            lines.push(line("Investment yield", 0.0, -yield_now));
            if labor_credit > 0.0 {
                lines.push(line("Care / labor credit", 0.0, -labor_credit));
            }
            note = "Stake stays liquid and portable — it was dead in the house. Maintenance-free unit.";
        }
        PersonaKind::YoungProfessional => {
            kind = "Young professional";
            // The rent gap that used to be landlord profit now accrues as a portable equity share.
            lines.push(line("Housing", current_housing, internal_rent));
            if labor_credit > 0.0 {
                lines.push(line("Labor credit", 0.0, -labor_credit));
            }
            equity_built_annual = (current_housing - internal_rent).max(0.0);
            note = "Rent gap accrues as a portable equity share instead of landlord profit.";
        }
        PersonaKind::YoungFamily => {
            kind = "Young family";
            lines.push(line("Housing", current_housing, internal_rent));
            // Childcare cleared in credit rather than cash.
            lines.push(line("Childcare", p.childcare_monthly * 12.0, 0.0));
            if labor_credit > 0.0 {
                lines.push(line("Labor credit", 0.0, -labor_credit));
            }
            note = "Childcare cleared in credit, not cash. Portable equity builds.";
        }
        PersonaKind::ServiceWorker => {
            kind = "Service worker";
            // Part-cash, part-labor-credit rent; ground-lease security.
            let cash_rent = (internal_rent - labor_credit).max(0.0);
            lines.push(line("Housing (cash share)", current_housing, cash_rent));
            if labor_credit > 0.0 {
                lines.push(line("Rent paid in labor credit", 0.0, -(internal_rent - cash_rent)));
                lines.push(line("Labor credit earned", 0.0, -labor_credit));
            }
            note = "Part-cash, part-labor-credit rent. Ground-lease security — can't be displaced.";
        }
        PersonaKind::RestaurantOwner => {
            kind = "Restaurant owner";
            // The extraction bleed is internalized; the margin stays with the business.
            lines.push(line("Housing", current_housing, internal_rent));
            lines.push(line("Extraction bleed (Square/MCA/QB)", p.business_bleed_annual, 0.0));
            if labor_credit > 0.0 {
                lines.push(line("Labor support credit", 0.0, -labor_credit));
            }
            note = "Recaptured margin + labor support + an exitable stake. Survival and liquidity.";
        }
    }

    let before_total: f64 = lines.iter().map(|l| l.before).sum();
    let after_total: f64 = lines.iter().map(|l| l.after).sum();

    PersonaResult {
        kind: kind.to_string(),
        lines,
        before_total,
        after_total,
        net_annual: before_total - after_total,
        equity_built_annual,
        note: note.to_string(),
    }
}

#[derive(Serialize, Deserialize)]
pub struct PersonaBatch {
    pub params: PersonaParams,
    pub inputs: Vec<PersonaInput>,
}

#[wasm_bindgen]
pub fn compute_personas(batch: JsValue) -> Result<JsValue, JsValue> {
    let b: PersonaBatch = serde_wasm_bindgen::from_value(batch)?;
    let out: Vec<PersonaResult> = b.inputs.iter().map(|i| compute_persona(i, &b.params)).collect();
    Ok(serde_wasm_bindgen::to_value(&out)?)
}

// ───────────────────────────── tests ─────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_one_reproduces_the_worked_example() {
        let cfg = NodeConfig {
            purchase_price: 2_000_000.0,
            renovation: 300_000.0,
            member_bonds: 700_000.0,
            bond_rate: 0.05,
            member_equity: 200_000.0,
            mortgage_rate: 0.065,
            mortgage_term_years: 30,
            units: 8,
            internal_rent_monthly: 1_200.0,
            commercial_rent_monthly: 3_000.0,
            tax_ins_maint: 56_000.0,
            enterprise_recapture: 62_000.0,
            building_share: 0.80,
        };
        let r = compute(&cfg);
        assert!((r.mortgage_principal - 1_400_000.0).abs() < 1.0);
        assert!((r.mortgage_annual - 106_000.0).abs() < 1_500.0); // ~$8,850/mo
        assert!(r.asset_layer_net < 0.0); // real estate alone is negative
        assert!(r.node_net_with_enterprise > 0.0); // enterprise layer tips it positive
        assert!((r.annual_depreciation - 58_182.0).abs() < 50.0);
    }

    #[test]
    fn enterprise_defaults_sum_to_the_worked_recapture() {
        let r = compute_enterprise(&EnterpriseConfig {
            annual_card_volume: 800_000.0,
            processor_rate: 0.030,
            at_cost_rate: 0.009,
            working_capital: 60_000.0,
            mca_apr: 0.50,
            member_pool_apr: 0.06,
            bookkeeping_saved: 6_000.0,
            procurement_savings: 12_800.0,
        });
        assert!((r.card_processing_saved - 16_800.0).abs() < 1.0);
        assert!((r.working_capital_saved - 26_400.0).abs() < 1.0);
        assert!((r.total_recapture - 62_000.0).abs() < 1.0); // matches NodeConfig.enterprise_recapture
    }

    #[test]
    fn trades_reno_savings_and_surplus() {
        let r = compute_trades(&TradesConfig {
            reno_cost: 300_000.0,
            market_markup: 0.30,
            member_markup: 0.10,
            external_gross: 750_000.0,
            external_margin: 0.10,
            solidarity_rate: 0.10,
            field_workers: 5,
        });
        assert!((r.reno_savings - 60_000.0).abs() < 1.0); // ~$60k cheaper per $300k reno
        assert!((r.external_surplus - 75_000.0).abs() < 1.0);
        assert!((r.solidarity_contribution - 7_500.0).abs() < 1.0);
    }

    #[test]
    fn young_professional_comes_out_ahead() {
        let params = PersonaParams {
            internal_rent_monthly: 1_200.0,
            bond_rate: 0.05,
            labor_credit_per_hour: 25.0,
        };
        let p = PersonaInput {
            kind: PersonaKind::YoungProfessional,
            current_housing_monthly: 2_100.0, // market rent
            home_equity: 0.0,
            childcare_monthly: 0.0,
            labor_hours_monthly: 0.0,
            business_bleed_annual: 0.0,
        };
        let r = compute_persona(&p, &params);
        assert!(r.net_annual > 0.0); // pays less than market rent
        assert!((r.net_annual - (2_100.0 - 1_200.0) * 12.0).abs() < 1.0);
        assert!((r.equity_built_annual - (2_100.0 - 1_200.0) * 12.0).abs() < 1.0);
    }

    #[test]
    fn mature_couple_yield_shows_up() {
        let params = PersonaParams {
            internal_rent_monthly: 1_200.0,
            bond_rate: 0.05,
            labor_credit_per_hour: 25.0,
        };
        let p = PersonaInput {
            kind: PersonaKind::MatureCouple,
            current_housing_monthly: 1_000.0, // owner carry on a paid-down house
            home_equity: 700_000.0,
            childcare_monthly: 0.0,
            labor_hours_monthly: 8.0,
            business_bleed_annual: 0.0,
        };
        let r = compute_persona(&p, &params);
        // $35k bond yield + care credit, against a higher internal rent than their cheap carry.
        assert!(r.after_total < 0.0); // yield + credit outweigh rent
        assert!(r.net_annual > 0.0);
    }
}
