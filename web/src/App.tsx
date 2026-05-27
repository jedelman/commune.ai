import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { evaluate_world_doc, initEngine } from "./lib/engine";
import { money, type PersonaInput, type PersonaKind } from "./lib/model";
import {
  PERSONA_LABELS,
  PERSONA_TEMPLATES,
  useWorld,
  type WorldEval,
} from "./lib/world";
import { NodeCard } from "./components/NodeCard";

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

  const world = useMemo<WorldEval | null>(
    () => (engineReady && doc ? (evaluate_world_doc(doc) as WorldEval) : null),
    [engineReady, doc],
  );

  const myPlayer = doc?.players.find((p) => p.id === me) ?? null;
  const myEval = world?.players.find((p) => p.id === me) ?? null;
  const joined = !!myPlayer;
  const handleOf = (id: string) => doc?.players.find((p) => p.id === id)?.handle ?? id;

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

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>commune.ai</h1>
          <p className="tag">Pilot your household. Run an institution. Watch the ecosystem move.</p>
        </div>
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
                  {myEval.demurrage > 0 && <p className="muted small">Demurrage on your balance: {money(myEval.demurrage)}/yr</p>}
                  <p className="muted small">{myEval.persona.note}</p>
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
            </section>
          </main>
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

function AddNode({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="add-node">
      <input placeholder="found a node…" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="ghost" onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); } }}>+ node</button>
    </div>
  );
}
