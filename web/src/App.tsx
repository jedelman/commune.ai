import { useEffect, useMemo, useRef, useState } from "react";
import {
  compute_enterprise_layer,
  compute_node,
  compute_personas,
  initEngine,
} from "./lib/engine";
import {
  DEFAULT_SCENARIO,
  decodeScenario,
  encodeScenario,
  type EnterpriseConfig,
  type EnterpriseResult,
  type NodeConfig,
  type NodeResult,
  type PersonaInput,
  type PersonaResult,
  type Scenario,
} from "./lib/model";
import { NodePanel } from "./components/NodePanel";
import { PersonaCard } from "./components/PersonaCard";

export default function App() {
  const [engineReady, setEngineReady] = useState(false);
  const [scenario, setScenario] = useState<Scenario>(
    () => decodeScenario(window.location.hash) ?? DEFAULT_SCENARIO,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initEngine().then(() => setEngineReady(true));
  }, []);

  // Reflect scenario into the URL hash (so it's shareable) without spamming history.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const hash = `#s=${encodeScenario(scenario)}`;
    window.history.replaceState(null, "", hash);
  }, [scenario]);

  const setNode = (patch: Partial<NodeConfig>) =>
    setScenario((s) => ({ ...s, node: { ...s.node, ...patch } }));
  const setEnterprise = (patch: Partial<EnterpriseConfig>) =>
    setScenario((s) => ({ ...s, enterprise: { ...s.enterprise, ...patch } }));
  const setLaborFloor = (laborFloor: number) =>
    setScenario((s) => ({ ...s, laborFloor }));
  const setPersona = (i: number, patch: Partial<PersonaInput>) =>
    setScenario((s) => ({
      ...s,
      personas: s.personas.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const enterpriseResult = useMemo<EnterpriseResult | null>(() => {
    if (!engineReady) return null;
    return compute_enterprise_layer(scenario.enterprise) as EnterpriseResult;
  }, [engineReady, scenario.enterprise]);

  const nodeResult = useMemo<NodeResult | null>(() => {
    if (!engineReady || !enterpriseResult) return null;
    // The recapture is derived from the enterprise breakdown, not entered directly.
    return compute_node({
      ...scenario.node,
      enterprise_recapture: enterpriseResult.total_recapture,
    }) as NodeResult;
  }, [engineReady, scenario.node, enterpriseResult]);

  const personaResults = useMemo<PersonaResult[]>(() => {
    if (!engineReady) return [];
    return compute_personas({
      params: {
        internal_rent_monthly: scenario.node.internal_rent_monthly,
        bond_rate: scenario.node.bond_rate,
        labor_credit_per_hour: scenario.laborFloor,
      },
      inputs: scenario.personas,
    }) as PersonaResult[];
  }, [engineReady, scenario]);

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the URL is already in the address bar */
    }
  };

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>commune.ai</h1>
          <p className="tag">Enter your real situation. See your own life — in the commune vs. now.</p>
        </div>
        <button className="share" onClick={share}>
          {copied ? "Link copied" : "Share this scenario"}
        </button>
      </header>

      {!engineReady && <p className="muted loading">loading engine…</p>}

      {engineReady && (
        <main className="layout">
          <NodePanel
            node={scenario.node}
            enterprise={scenario.enterprise}
            enterpriseResult={enterpriseResult}
            laborFloor={scenario.laborFloor}
            result={nodeResult}
            onNode={setNode}
            onEnterprise={setEnterprise}
            onLaborFloor={setLaborFloor}
          />

          <section className="personas">
            <h2>Who comes out ahead</h2>
            <p className="muted">
              Each card is one person's actual number. Adjust the node on the left, or edit a
              person's situation below their card — every figure recomputes live.
            </p>
            <div className="persona-grid">
              {personaResults.map((r, i) => (
                <PersonaCard
                  key={scenario.personas[i].kind}
                  input={scenario.personas[i]}
                  result={r}
                  onChange={(patch) => setPersona(i, patch)}
                />
              ))}
            </div>
          </section>
        </main>
      )}

      <footer className="foot muted">
        v1 — single node, client-side. Model: <code>model/src/lib.rs</code>. Numbers are scenario
        inputs, not advice. Federation clearing &amp; saved scenarios come later.
      </footer>
    </div>
  );
}
