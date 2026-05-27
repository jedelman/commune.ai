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

// ───────────────────────────── 6. Federation / World (multiplayer sim) ─────────────────────────────
// The whole world is one deterministic document. `evaluate_world` is pure: given the shared doc
// (nodes + their role-governed dials + players' public state), it returns everyone's number, each
// node's clearing position, the Bancor carrying charges, and the federation reserve flow. The
// Durable Object owns the doc and serializes writes; every client runs THIS function over the same
// doc, so all tabs agree without server-side compute. The cascade is structural: a player's
// rolled-in equity IS part of their node's capital stack, so one governance change moves everyone.

/// Dials owned by governance roles (capital-stack role + federation role).
#[derive(Serialize, Deserialize, Clone)]
pub struct Governance {
    pub internal_rent_monthly: f64, // capital-stack role
    pub bond_rate: f64,             // capital-stack role
    pub mortgage_rate: f64,         // capital-stack role
    pub commercial_rent_monthly: f64,
    pub compression_floor: f64,     // federation role: CC/hr for care/unskilled (the egalitarian floor)
    pub compression_cap_mult: f64,  // specialized cap = floor × mult (politics, not the unit)
    pub demurrage_rate: f64,        // federation role: /yr on positive CC balances
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorldNode {
    pub id: String,
    pub name: String,
    /// Fixed-ish asset facts (purchase, reno, tax/maint, units, enterprise recapture, building share).
    /// member_bonds / member_equity here are IGNORED — they're derived from the players who joined.
    pub config: NodeConfig,
    pub governance: Governance,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorldPlayer {
    pub id: String,
    pub handle: String,
    pub node_id: String,
    pub persona: PersonaInput,
    pub equity_buyin: f64, // limited-equity share contributed to the node
}

/// A mutual-credit transfer: `from` debits, `to` credits, sum ≡ 0. Accounts are player ids or
/// node ids (a node's pool is a ledger account). This is the only way a balance changes — the
/// ledger is the append-only stream, never a mutated number.
#[derive(Serialize, Deserialize, Clone)]
pub struct Tx {
    pub ts_ms: f64,
    pub from: String,
    pub to: String,
    pub amount: f64,
}

/// Symmetric Bancor bands as fractions of a node's quota (annual internal turnover).
#[derive(Serialize, Deserialize, Clone)]
pub struct ClearingBands {
    pub band1: f64, // within this: 0%
    pub rate1: f64, // beyond band1
    pub band2: f64,
    pub rate2: f64, // beyond band2
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorldDoc {
    pub nodes: Vec<WorldNode>,
    pub players: Vec<WorldPlayer>,
    pub reserve: f64, // seed; the live reserve is this + the "fed" ledger account
    pub bands: ClearingBands,
    #[serde(default)]
    pub txs: Vec<Tx>, // the mutual-credit ledger (append-only event stream)
    #[serde(default)]
    pub period: u32, // sim periods (≈ months) advanced by the world's heartbeat
}

/// The federation reserve's ledger account id (Bancor clearing charges accrue here).
pub const FED_ACCOUNT: &str = "fed";

const MS_PER_YEAR: f64 = 365.25 * 24.0 * 3600.0 * 1000.0;

fn decayed(bal: f64, dt_ms: f64, rate: f64) -> f64 {
    // Demurrage erodes only a POSITIVE running balance (idle credit), never a debt.
    if bal > 0.0 && rate > 0.0 && dt_ms > 0.0 {
        bal * (-rate * (dt_ms / MS_PER_YEAR)).exp()
    } else {
        bal
    }
}

/// Pure, functional-reactive balance: a left-fold over this account's time-ordered ledger entries,
/// applying continuous demurrage to the positive running balance between events, evaluated at
/// `now_ms`. Re-running it with a later `now_ms` is the whole "tick" — balances decay in wall-clock
/// time with no mutation. Returns (balance_now, demurrage_per_year_now).
pub fn balance_at(txs: &[Tx], account: &str, now_ms: f64, demurrage_rate: f64) -> (f64, f64) {
    let mut events: Vec<(f64, f64)> = Vec::new();
    for tx in txs {
        if tx.to == account {
            events.push((tx.ts_ms, tx.amount));
        }
        if tx.from == account {
            events.push((tx.ts_ms, -tx.amount));
        }
    }
    if events.is_empty() {
        return (0.0, 0.0);
    }
    events.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    let mut bal = 0.0;
    let mut t_prev = events[0].0;
    for (ts, delta) in events {
        bal = decayed(bal, ts - t_prev, demurrage_rate);
        bal += delta;
        t_prev = ts;
    }
    bal = decayed(bal, now_ms - t_prev, demurrage_rate);
    let demurrage_per_year = if bal > 0.0 { bal * demurrage_rate } else { 0.0 };
    (bal, demurrage_per_year)
}

#[derive(Serialize, Deserialize)]
pub struct NodeEval {
    pub id: String,
    pub name: String,
    pub members: u32,
    pub committed_bonds: f64,  // Σ rolled-in home equity
    pub committed_equity: f64, // Σ limited-equity buy-ins
    pub node_result: NodeResult,
    pub clears: bool,          // node net (asset + enterprise) ≥ 0
    pub quota: f64,            // annual internal turnover (Bancor quota)
    pub clearing_balance: f64, // surplus(+)/deficit(−) position vs the union
    pub carrying_charge: f64,  // symmetric Bancor charge → reserve
    pub pool_balance: f64,     // the node pool's CC position (derived from the ledger)
}

#[derive(Serialize, Deserialize)]
pub struct PlayerEval {
    pub id: String,
    pub handle: String,
    pub node_id: String,
    pub persona: PersonaResult,
    pub cc_balance: f64, // derived from the ledger at now_ms
    pub demurrage: f64,  // CC/yr eroding off the current positive balance
}

#[derive(Serialize, Deserialize)]
pub struct WorldEval {
    pub nodes: Vec<NodeEval>,
    pub players: Vec<PlayerEval>,
    pub reserve: f64,            // seed + the "fed" ledger account balance (a real stock)
    pub carrying_charges: f64,   // current per-period Bancor charge rate across nodes (display)
    pub federation_clears: bool, // every node clears AND reserve stays non-negative
    pub period: u32,
}

pub fn evaluate_world(doc: &WorldDoc, now_ms: f64) -> WorldEval {
    let mut node_evals: Vec<NodeEval> = Vec::new();
    let mut carrying_charges = 0.0;

    for n in &doc.nodes {
        let pool_balance = balance_at(&doc.txs, &n.id, now_ms, n.governance.demurrage_rate).0;
        let members: Vec<&WorldPlayer> = doc.players.iter().filter(|p| p.node_id == n.id).collect();
        let committed_bonds: f64 = members.iter().map(|p| p.persona.home_equity).sum();
        let committed_equity: f64 = members.iter().map(|p| p.equity_buyin).sum();

        // Effective config: players capitalize the node; governance sets the rates/rent.
        let cfg = NodeConfig {
            member_bonds: committed_bonds,
            member_equity: committed_equity,
            bond_rate: n.governance.bond_rate,
            mortgage_rate: n.governance.mortgage_rate,
            internal_rent_monthly: n.governance.internal_rent_monthly,
            commercial_rent_monthly: n.governance.commercial_rent_monthly,
            ..n.config.clone()
        };
        let node_result = compute(&cfg);

        let quota = node_result.income_total.max(1.0);
        let clearing_balance = node_result.node_net_with_enterprise;
        // Symmetric carrying charge on |balance| relative to quota — both surplus and deficit pay.
        let ratio = (clearing_balance / quota).abs();
        let charge = if ratio > doc.bands.band2 {
            clearing_balance.abs() * doc.bands.rate2
        } else if ratio > doc.bands.band1 {
            clearing_balance.abs() * doc.bands.rate1
        } else {
            0.0
        };
        carrying_charges += charge;

        node_evals.push(NodeEval {
            id: n.id.clone(),
            name: n.name.clone(),
            members: members.len() as u32,
            committed_bonds,
            committed_equity,
            clears: node_result.node_net_with_enterprise >= 0.0,
            quota,
            clearing_balance,
            carrying_charge: charge,
            pool_balance,
            node_result,
        });
    }

    let mut player_evals: Vec<PlayerEval> = Vec::new();
    let mut total_demurrage = 0.0;
    for p in &doc.players {
        let gov = doc
            .nodes
            .iter()
            .find(|n| n.id == p.node_id)
            .map(|n| &n.governance);
        let (internal_rent, bond_rate, floor, demurrage_rate) = match gov {
            Some(g) => (g.internal_rent_monthly, g.bond_rate, g.compression_floor, g.demurrage_rate),
            None => (0.0, 0.0, 0.0, 0.0),
        };
        let params = PersonaParams {
            internal_rent_monthly: internal_rent,
            bond_rate,
            labor_credit_per_hour: floor,
        };
        let (cc_balance, demurrage) = balance_at(&doc.txs, &p.id, now_ms, demurrage_rate);
        total_demurrage += demurrage;
        player_evals.push(PlayerEval {
            id: p.id.clone(),
            handle: p.handle.clone(),
            node_id: p.node_id.clone(),
            persona: compute_persona(&p.persona, &params),
            cc_balance,
            demurrage,
        });
    }

    // The reserve is a real ledger stock: the seed + whatever Bancor clearing charges have been
    // posted to the "fed" account. (Demurrage melts idle credit — Gesell — rather than being
    // redistributed; total_demurrage is the live erosion rate, shown per player.)
    let _ = total_demurrage;
    let fed_balance = balance_at(&doc.txs, FED_ACCOUNT, now_ms, 0.0).0;
    let reserve = doc.reserve + fed_balance;
    let federation_clears = node_evals.iter().all(|n| n.clears) && reserve >= 0.0;

    WorldEval {
        nodes: node_evals,
        players: player_evals,
        reserve,
        carrying_charges,
        federation_clears,
        period: doc.period,
    }
}

#[wasm_bindgen]
pub fn evaluate_world_doc(doc: JsValue, now_ms: f64) -> Result<JsValue, JsValue> {
    let d: WorldDoc = serde_wasm_bindgen::from_value(doc)?;
    Ok(serde_wasm_bindgen::to_value(&evaluate_world(&d, now_ms))?)
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

    fn demo_world() -> WorldDoc {
        let gov = Governance {
            internal_rent_monthly: 1_200.0,
            bond_rate: 0.05,
            mortgage_rate: 0.065,
            commercial_rent_monthly: 3_000.0,
            compression_floor: 25.0,
            compression_cap_mult: 2.0,
            demurrage_rate: 0.05,
        };
        let base = NodeConfig {
            purchase_price: 2_000_000.0,
            renovation: 300_000.0,
            member_bonds: 0.0,  // derived from players
            bond_rate: 0.05,
            member_equity: 0.0, // derived from players
            mortgage_rate: 0.065,
            mortgage_term_years: 30,
            units: 8,
            internal_rent_monthly: 1_200.0,
            commercial_rent_monthly: 3_000.0,
            tax_ins_maint: 56_000.0,
            enterprise_recapture: 62_000.0,
            building_share: 0.80,
        };
        WorldDoc {
            nodes: vec![WorldNode { id: "n1".into(), name: "Node #1".into(), config: base, governance: gov }],
            players: vec![WorldPlayer {
                id: "p1".into(),
                handle: "couple".into(),
                node_id: "n1".into(),
                persona: PersonaInput {
                    kind: PersonaKind::MatureCouple,
                    current_housing_monthly: 1_000.0,
                    home_equity: 700_000.0,
                    childcare_monthly: 0.0,
                    labor_hours_monthly: 8.0,
                    business_bleed_annual: 0.0,
                },
                equity_buyin: 200_000.0,
            }],
            reserve: 50_000.0,
            bands: ClearingBands { band1: 0.25, rate1: 0.01, band2: 0.50, rate2: 0.02 },
            txs: vec![],
            period: 0,
        }
    }

    #[test]
    fn world_derives_capital_stack_from_players() {
        let w = demo_world();
        let e = evaluate_world(&w, 0.0);
        let n = &e.nodes[0];
        // The single couple's $700k equity + $200k buy-in IS the node's bond + equity stack.
        assert!((n.committed_bonds - 700_000.0).abs() < 1.0);
        assert!((n.committed_equity - 200_000.0).abs() < 1.0);
        assert!((n.node_result.mortgage_principal - 1_400_000.0).abs() < 1.0);
        assert_eq!(e.players.len(), 1);
    }

    #[test]
    fn governance_change_cascades_to_node_and_players() {
        let base = demo_world();
        let before = evaluate_world(&base, 0.0);

        // Capital-stack role drops internal rent: members better off, node clears worse.
        let mut cheaper = demo_world();
        cheaper.nodes[0].governance.internal_rent_monthly = 600.0;
        let after = evaluate_world(&cheaper, 0.0);

        assert!(after.players[0].persona.net_annual > before.players[0].persona.net_annual);
        assert!(after.nodes[0].node_result.asset_layer_net < before.nodes[0].node_result.asset_layer_net);
    }

    #[test]
    fn ledger_credits_decay_with_demurrage_over_time() {
        let mut w = demo_world();
        // The node pool credits the couple 10,000 CC for labor at t = 0.
        w.txs.push(Tx { ts_ms: 0.0, from: "n1".into(), to: "p1".into(), amount: 10_000.0 });

        // At t = 0: balance is the full credit; pool holds the mirror −10,000; sum ≡ 0.
        let now0 = evaluate_world(&w, 0.0);
        let p0 = now0.players[0].cc_balance;
        assert!((p0 - 10_000.0).abs() < 1.0);
        assert!((now0.nodes[0].pool_balance + p0).abs() < 1.0);
        assert!((now0.players[0].demurrage - 500.0).abs() < 1.0); // 5%/yr of 10k

        // One year later (demurrage 5%/yr): the idle credit has eroded to ~10k·e^-0.05.
        let one_year = MS_PER_YEAR;
        let now1 = evaluate_world(&w, one_year);
        let p1 = now1.players[0].cc_balance;
        assert!(p1 < p0);
        assert!((p1 - 10_000.0 * (-0.05_f64).exp()).abs() < 1.0);
        // Demurrage melts idle credit (Gesell) — it does NOT add to the reserve.
        assert!((now1.reserve - 50_000.0).abs() < 1.0);

        // The reserve IS a ledger stock: a Bancor charge posted to the fed account lifts it.
        w.txs.push(Tx { ts_ms: 0.0, from: "n1".into(), to: FED_ACCOUNT.into(), amount: 200.0 });
        let funded = evaluate_world(&w, one_year);
        assert!((funded.reserve - 50_200.0).abs() < 1.0);
    }
}
