import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { evaluate_world_doc, initEngine } from "./lib/engine";
import { money, type PersonaInput, type PersonaKind } from "./lib/model";
import {
  PERSONA_LABELS,
  PERSONA_TEMPLATES,
  useWorld,
  type PlayerEval,
  type WorldEval,
} from "./lib/world";
import { NodeCard } from "./components/NodeCard";
import { Dashboard } from "./components/Dashboard";

const BeforeAfterChart = lazy(() => import("./components/BeforeAfterChart"));

function useIdentity() {
  const [pid] = useState(() => {
    let v = localStorage.getItem("commune_pid");
    if (!v) {
      v = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("commune_pid", v);
    }
    return v;
  });
  const [handle, setHandle] = useState(() => localStorage.getItem("commune_handle") || "guest");
  useEffect(() => localStorage.setItem("commune_handle", handle), [handle]);
  return { pid, handle, setHandle };
}

const PERSONA_KINDS: PersonaKind[] = [
  "mature_couple",
  "young_professional",
  "young_family",
  "service_worker",
  "restaurant_owner",
];

export default function App() {
  const { pid, handle, setHandle } = useIdentity();
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => {
    initEngine().then(() => setEngineReady(true));
  }, []);

  const { status, doc, roles, pid: me, error, send } = useWorld("main", pid, handle);

  // Wall-clock tick: re-evaluating with a later `now` is the whole "tick" — demurrage erodes
  // idle balances continuously, no server loop. The ledger is a pure function of (events, now).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const world = useMemo<WorldEval | null>(
    () => (engineReady && doc ? (evaluate_world_doc(doc, now) as WorldEval) : null),
    [engineReady, doc, now],
  );

  const myPlayer = doc?.players.find((p) => p.id === me) ?? null;
  const myEval = world?.players.find((p) => p.id === me) ?? null;
  const joined = !!myPlayer;
  const handleOf = (id: string) => doc?.players.find((p) => p.id === id)?.handle ?? id;
  const nameOf = (id: string) =>
    id === "fed" ? "reserve" : (doc?.nodes.find((n) => n.id === id)?.name ?? handleOf(id));

  // Local editor state for my persona before/while joined.
  const [kind, setKind] = useState<PersonaKind>("young_professional");
  const [persona, setPersona] = useState<PersonaInput>(PERSONA_TEMPLATES.young_professional);
  const [nodeId, setNodeId] = useState("");
  const [buyin, setBuyin] = useState(50_000);
  useEffect(() => {
    if (!nodeId && doc?.nodes[0]) setNodeId(doc.nodes[0].id);
  }, [doc, nodeId]);

  const pushPersona = (next: PersonaInput, nextNode = nodeId, nextBuyin = buyin) => {
    if (joined) send({ t: "setPersona", persona: next, equity_buyin: nextBuyin, node_id: nextNode });
  };
  const changeKind = (k: PersonaKind) => {
    const next = PERSONA_TEMPLATES[k];
    setKind(k);
    setPersona(next);
    pushPersona(next);
  };
  const patch = (p: Partial<PersonaInput>) => {
    const next = { ...persona, ...p };
    setPersona(next);
    pushPersona(next);
  };

  const fedHolder = roles["federation"];
  const iRunFed = fedHolder === me;
  const fedNodeId = doc?.nodes[0]?.id ?? "";

  const [view, setView] = useState<"play" | "system">("play");

  // Jubilee proposals (collective debt forgiveness).
  const myNodeId = myPlayer?.node_id;
  const myProposal = me ? doc?.proposals?.find((p) => p.debtor === me) : undefined;
  const nodeProposals = (doc?.proposals ?? []).filter((p) => myNodeId && p.node_id === myNodeId);
  const debtOf = (id: string) => {
    const e = world?.players.find((pp) => pp.id === id);
    return e ? Math.max(0, -e.cc_balance) : 0;
  };
  const neededFor = (nodeId: string, debtor: string) => {
    const others = (world?.players ?? []).filter((pp) => pp.node_id === nodeId && pp.id !== debtor).length;
    return Math.floor(others / 2) + 1;
  };

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>commune.ai</h1>
          <p className="tag">Pilot your household. Run an institution. Watch the ecosystem move.</p>
        </div>
        <nav className="viewtabs">
          <button className={view === "play" ? "on" : ""} onClick={() => setView("play")}>Play</button>
          <button className={view === "system" ? "on" : ""} onClick={() => setView("system")}>System</button>
        </nav>
        <div className="ident">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} aria-label="your handle" />
          <span className={`dot ${status}`} title={status} />
        </div>
      </header>

      {error && <div className="toast">{error}</div>}
      {(!engineReady || !doc) && <p className="muted loading">connecting…</p>}

      {engineReady && doc && world && (
        <>
          <section className="fed-summary">
            <div><span>Federation</span><b className={world.federation_clears ? "pos" : "neg"}>{world.federation_clears ? "solvent" : "under-capitalized"}</b></div>
            <div><span>Reserve</span><b>{money(world.reserve)}</b></div>
            <div><span>Clearing charges</span><b>{money(world.carrying_charges)}</b></div>
            <div><span>Members</span><b>{doc.players.length}</b></div>
            <div><span>Nodes</span><b>{doc.nodes.length}</b></div>
            <div><span>Period (mo)</span><b>{world.period}</b></div>
            <div className="fed-role">
              <span>Federation role (compression, demurrage)</span>
              <b>{fedHolder ? handleOf(fedHolder) : "unclaimed"}</b>
              {iRunFed ? (
                <button className="ghost" onClick={() => send({ t: "release", role: "federation" })}>release</button>
              ) : !fedHolder ? (
                <button className="ghost" onClick={() => send({ t: "claim", role: "federation" })}>claim</button>
              ) : null}
            </div>
          </section>

          {view === "system" && <Dashboard world={world} roles={roles} handleOf={handleOf} />}

          {view === "play" && (
          <main className="layout">
            <section className="panel">
              <h2>{joined ? "Your household" : "Join the simulation"}</h2>

              <label className="select">
                <span>You are a…</span>
                <select value={kind} onChange={(e) => changeKind(e.target.value as PersonaKind)}>
                  {PERSONA_KINDS.map((k) => (
                    <option key={k} value={k}>{PERSONA_LABELS[k]}</option>
                  ))}
                </select>
              </label>

              <label className="select">
                <span>Node</span>
                <select
                  value={nodeId}
                  onChange={(e) => {
                    setNodeId(e.target.value);
                    pushPersona(persona, e.target.value);
                  }}
                >
                  {doc.nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </label>

              <NumRow label="Your rent / carry now ($/mo)" value={persona.current_housing_monthly} step={50} onChange={(v) => patch({ current_housing_monthly: v })} />
              <NumRow label="Hours you'd contribute (hrs/mo)" value={persona.labor_hours_monthly} step={1} onChange={(v) => patch({ labor_hours_monthly: v })} />
              {kind === "mature_couple" && (
                <NumRow label="Home equity rolled in ($)" value={persona.home_equity} step={10_000} onChange={(v) => patch({ home_equity: v })} />
              )}
              {kind === "young_family" && (
                <NumRow label="Childcare now ($/mo)" value={persona.childcare_monthly} step={50} onChange={(v) => patch({ childcare_monthly: v })} />
              )}
              {kind === "restaurant_owner" && (
                <NumRow label="Extraction bleed now ($/yr)" value={persona.business_bleed_annual} step={1_000} onChange={(v) => patch({ business_bleed_annual: v })} />
              )}
              <NumRow label="Limited-equity buy-in ($)" value={buyin} step={10_000} onChange={(v) => { setBuyin(v); pushPersona(persona, nodeId, v); }} />

              {!joined && (
                <button className="primary" onClick={() => send({ t: "join", node_id: nodeId, persona, equity_buyin: buyin })}>
                  Join — capitalize this node
                </button>
              )}

              {joined && myEval && (
                <div className="me-result">
                  <div className={`net ${myEval.persona.net_annual >= 0 ? "pos" : "neg"}`}>
                    <span className="net-num">{money(Math.abs(myEval.persona.net_annual))}/yr</span>
                    <span className="net-word">{myEval.persona.net_annual >= 0 ? "better off" : "worse off"}</span>
                  </div>
                  {myEval.persona.equity_built_annual > 0 && (
                    <div className="equity">+ {money(myEval.persona.equity_built_annual)}/yr portable equity</div>
                  )}
                  <Suspense fallback={<div className="chart-skel" style={{ height: 140 }} />}>
                    <BeforeAfterChart beforeTotal={myEval.persona.before_total} afterTotal={myEval.persona.after_total} better={myEval.persona.net_annual >= 0} />
                  </Suspense>
                  <table className="lines">
                    <tbody>
                      {myEval.persona.lines.map((l) => (
                        <tr key={l.label}><td>{l.label}</td><td>{money(l.before)}</td><td>{money(l.after)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="muted small">{myEval.persona.note}</p>

                  {(() => {
                    const myNode = world.nodes.find((n) => n.id === myEval.node_id);
                    return (
                      <div className="capital">
                        <div className="cap-head"><span className="lbl">Your capital</span><span className="muted small">{Math.round(myEval.capital_share * 100)}% of this node</span></div>
                        <div className="cap-row"><span>Bond (loan in)</span><b>{money(myEval.bond_position)}</b><span className="muted small">+{money(myEval.bond_yield)}/yr</span></div>
                        <div className="cap-row"><span>Equity share</span><b>{money(myEval.equity_position)}</b></div>
                        <div className="cap-row total"><span>Your committed capital</span><b>{money(myEval.capital_total)}</b></div>
                        {myNode && (
                          <div className="cap-collective muted small">
                            Node total: {money(myNode.member_capital)} member capital ({Math.round(myNode.capital_ratio * 100)}% of project) ·
                            Federation: {money(world.system.committed_bonds + world.system.committed_equity)}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="ledger">
                    <div className="bal">
                      <span className="muted small">Mutual-credit balance</span>
                      <b className={myEval.cc_balance >= 0 ? "pos" : "neg"}>{money(myEval.cc_balance)} CC</b>
                      {myEval.demurrage > 0 && <span className="muted small">eroding {money(myEval.demurrage)}/yr (demurrage)</span>}
                    </div>
                    <LaborRow onLog={(h) => send({ t: "labor", hours: h })} />
                    <TransferRow
                      members={world.players.filter((p) => p.id !== me)}
                      onSend={(to, amount) => send({ t: "transfer", to, amount })}
                    />
                    {myEval.cc_balance < 0 &&
                      (myProposal ? (
                        <p className="muted small">
                          Jubilee requested · {myProposal.votes.length}/{neededFor(myProposal.node_id, myProposal.debtor)} neighbors approving
                        </p>
                      ) : (
                        <button className="ghost wide-btn" onClick={() => send({ t: "proposeJubilee" })}>
                          Request jubilee ({money(-myEval.cc_balance)} debt)
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </section>

            <section className="nodes-wrap">
              <div className="nodes-head">
                <h2>The federation</h2>
                <AddNode onAdd={(name) => send({ t: "addNode", name })} />
              </div>
              <div className="nodes-grid">
                {doc.nodes.map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    evaluation={world.nodes.find((e) => e.id === n.id)}
                    roles={roles}
                    pid={me ?? ""}
                    holderHandle={handleOf}
                    send={send}
                  />
                ))}
              </div>

              {iRunFed && (
                <div className="panel fed-gov">
                  <h3>Federation dials (you hold this role)</h3>
                  <p className="muted small">Apply across every node. Compression = the commune↔market labor dial; demurrage kills accumulation.</p>
                  <NumRow label="Compression floor (CC/hr)" value={doc.nodes[0]?.governance.compression_floor ?? 25} step={1} onChange={(v) => send({ t: "governance", node_id: fedNodeId, field: "compression_floor", value: v })} />
                  <NumRow label="Demurrage rate (%/yr)" value={Math.round((doc.nodes[0]?.governance.demurrage_rate ?? 0) * 100)} step={1} onChange={(v) => send({ t: "governance", node_id: fedNodeId, field: "demurrage_rate", value: v / 100 })} />
                </div>
              )}

              {nodeProposals.length > 0 && (
                <div className="panel jubilee">
                  <h3>Jubilee proposals <span className="muted small">· your node decides (majority)</span></h3>
                  {nodeProposals.map((p) => {
                    const canVote = !!me && p.debtor !== me && !p.votes.includes(me);
                    return (
                      <div className="prop" key={p.id}>
                        <span>{handleOf(p.debtor)} requests forgiveness of <b>{money(debtOf(p.debtor))} CC</b></span>
                        <span className="muted small">{p.votes.length}/{neededFor(p.node_id, p.debtor)}</span>
                        {canVote ? (
                          <button className="ghost" onClick={() => send({ t: "voteJubilee", id: p.id })}>approve</button>
                        ) : (
                          <span className="muted small">{p.debtor === me ? "your request" : "voted"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="panel feed">
                <h3>Economy feed <span className="muted small">· rent + labor + clearing post each period (≈8s)</span></h3>
                {doc.txs.length === 0 ? (
                  <p className="muted small">No transactions yet — the heartbeat starts once someone joins.</p>
                ) : (
                  <ul className="feed-list">
                    {doc.txs.slice(-12).reverse().map((tx, i) => (
                      <li key={`${tx.ts_ms}-${i}`}>
                        <span>{nameOf(tx.from)} → {nameOf(tx.to)}</span>
                        <b>{money(tx.amount)} CC</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </main>
          )}
        </>
      )}

      <footer className="foot muted">
        Multiplayer sim · one shared world, role-governed, real-time. Engine: <code>model/src/lib.rs</code>.
        Numbers are scenario inputs, not advice.
      </footer>
    </div>
  );
}

function NumRow({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="num wide">
      <span>{label}</span>
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function LaborRow({ onLog }: { onLog: (hours: number) => void }) {
  const [hours, setHours] = useState(8);
  return (
    <div className="action">
      <span className="muted small">Log labor</span>
      <input type="number" min={0} step={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      <button className="ghost" onClick={() => hours > 0 && onLog(hours)}>mint credit</button>
    </div>
  );
}

function TransferRow({ members, onSend }: { members: PlayerEval[]; onSend: (to: string, amount: number) => void }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(500);
  if (members.length === 0) return null;
  return (
    <div className="action">
      <span className="muted small">Send CC</span>
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">to…</option>
        {members.map((p) => (
          <option key={p.id} value={p.id}>{p.handle} ({money(p.cc_balance)})</option>
        ))}
      </select>
      <input type="number" min={0} step={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      <button className="ghost" onClick={() => to && amount > 0 && onSend(to, amount)}>send</button>
    </div>
  );
}

function AddNode({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="add-node">
      <input placeholder="found a node…" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="ghost" onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); } }}>+ node</button>
    </div>
  );
}
