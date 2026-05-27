import {
  CAPITAL_STACK_FIELDS,
  FEDERATION_FIELDS,
  type Governance,
  type Roles,
  type WorldDoc,
  type WorldNode,
  type WorldPlayer,
} from "./types";

interface Env {
  DB?: D1Database;
}

const DEFAULT_GOVERNANCE: Governance = {
  internal_rent_monthly: 1_200,
  bond_rate: 0.05,
  mortgage_rate: 0.065,
  commercial_rent_monthly: 3_000,
  compression_floor: 25,
  compression_cap_mult: 2,
  demurrage_rate: 0.05,
};

function defaultNode(id: string, name: string): WorldNode {
  return {
    id,
    name,
    config: {
      purchase_price: 2_000_000,
      renovation: 300_000,
      member_bonds: 0, // derived from players
      bond_rate: 0.05,
      member_equity: 0, // derived from players
      mortgage_rate: 0.065,
      mortgage_term_years: 30,
      units: 8,
      internal_rent_monthly: 1_200,
      commercial_rent_monthly: 3_000,
      tax_ins_maint: 56_000,
      enterprise_recapture: 62_000,
      building_share: 0.8,
    },
    governance: { ...DEFAULT_GOVERNANCE },
  };
}

function defaultDoc(): WorldDoc {
  return {
    nodes: [defaultNode("n1", "Node #1 · Norfolk"), defaultNode("n2", "Node #2 · Richmond")],
    players: [],
    reserve: 50_000,
    bands: { band1: 0.25, rate1: 0.01, band2: 0.5, rate2: 0.02 },
  };
}

// Anti-grief clamps: keep governed dials inside sane ranges so a role-holder can't NaN the world.
const CLAMPS: Record<string, [number, number]> = {
  internal_rent_monthly: [200, 5_000],
  commercial_rent_monthly: [0, 30_000],
  bond_rate: [0, 0.2],
  mortgage_rate: [0, 0.2],
  compression_floor: [1, 200],
  compression_cap_mult: [1, 20],
  demurrage_rate: [0, 0.5],
};

function clampField(field: string, value: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const c = CLAMPS[field];
  return c ? Math.min(c[1], Math.max(c[0], value)) : null;
}

interface Session {
  pid: string;
  handle: string;
}

export class World {
  private ctx: DurableObjectState;
  private env: Env;
  private sessions = new Map<WebSocket, Session>();
  private doc!: WorldDoc;
  private roles!: Roles;
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  private async load() {
    if (this.loaded) return;
    this.doc = (await this.ctx.storage.get<WorldDoc>("doc")) ?? defaultDoc();
    this.roles = (await this.ctx.storage.get<Roles>("roles")) ?? {};
    this.loaded = true;
  }

  private async persist() {
    await this.ctx.storage.put("doc", this.doc);
    await this.ctx.storage.put("roles", this.roles);
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const url = new URL(req.url);
    const pid = url.searchParams.get("pid") || crypto.randomUUID().slice(0, 8);
    const handle = (url.searchParams.get("handle") || "guest").slice(0, 24);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    this.sessions.set(server, { pid, handle });

    server.send(JSON.stringify({ t: "state", doc: this.doc, roles: this.roles, you: pid }));

    server.addEventListener("message", (evt) => {
      this.onMessage(server, evt.data as string).catch((e) =>
        server.send(JSON.stringify({ t: "error", message: String(e) })),
      );
    });
    server.addEventListener("close", () => this.sessions.delete(server));
    server.addEventListener("error", () => this.sessions.delete(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast() {
    const msg = JSON.stringify({ t: "state", doc: this.doc, roles: this.roles });
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(msg);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }

  private async log(world: string, pid: string, kind: string, payload: unknown) {
    if (!this.env.DB) return;
    try {
      await this.env.DB.prepare(
        "INSERT INTO events (world_id, player_id, kind, payload) VALUES (?, ?, ?, ?)",
      )
        .bind(world, pid, kind, JSON.stringify(payload))
        .run();
    } catch {
      /* logging is best-effort; never block the sim on the ledger */
    }
  }

  private nodeById(id: string): WorldNode | undefined {
    return this.doc.nodes.find((n) => n.id === id);
  }

  private async onMessage(ws: WebSocket, raw: string) {
    const sess = this.sessions.get(ws);
    if (!sess) return;
    const m = JSON.parse(raw) as Record<string, unknown>;
    const t = m.t as string;
    let changed = false;

    switch (t) {
      case "join": {
        const node_id = String(m.node_id);
        if (!this.nodeById(node_id)) break;
        const existing = this.doc.players.find((p) => p.id === sess.pid);
        const player: WorldPlayer = {
          id: sess.pid,
          handle: sess.handle,
          node_id,
          persona: m.persona as WorldPlayer["persona"],
          equity_buyin: Math.max(0, Number(m.equity_buyin) || 0),
          cc_balance: existing?.cc_balance ?? 0,
        };
        if (existing) Object.assign(existing, player);
        else this.doc.players.push(player);
        changed = true;
        await this.log("w", sess.pid, "join", { node_id });
        break;
      }
      case "setPersona": {
        const me = this.doc.players.find((p) => p.id === sess.pid);
        if (me) {
          me.persona = m.persona as WorldPlayer["persona"];
          if (m.equity_buyin !== undefined) me.equity_buyin = Math.max(0, Number(m.equity_buyin) || 0);
          if (m.node_id !== undefined && this.nodeById(String(m.node_id))) me.node_id = String(m.node_id);
          changed = true;
        }
        break;
      }
      case "claim": {
        const role = String(m.role);
        const key = role === "federation" ? "federation" : `${String(m.node_id)}:capital_stack`;
        if (role !== "federation" && !this.nodeById(String(m.node_id))) break;
        const holder = this.roles[key];
        if (!holder || holder === sess.pid) {
          this.roles[key] = sess.pid;
          changed = true;
          await this.log("w", sess.pid, "claim_role", { key });
        } else {
          ws.send(JSON.stringify({ t: "error", message: `role ${key} held by another member` }));
        }
        break;
      }
      case "release": {
        const role = String(m.role);
        const key = role === "federation" ? "federation" : `${String(m.node_id)}:capital_stack`;
        if (this.roles[key] === sess.pid) {
          delete this.roles[key];
          changed = true;
          await this.log("w", sess.pid, "release_role", { key });
        }
        break;
      }
      case "governance": {
        const node_id = String(m.node_id);
        const field = String(m.field);
        const value = clampField(field, Number(m.value));
        if (value === null) break;
        const isCapital = (CAPITAL_STACK_FIELDS as readonly string[]).includes(field);
        const isFed = (FEDERATION_FIELDS as readonly string[]).includes(field);
        if (isCapital) {
          if (this.roles[`${node_id}:capital_stack`] !== sess.pid) {
            ws.send(JSON.stringify({ t: "error", message: "you don't hold the capital-stack role here" }));
            break;
          }
          const node = this.nodeById(node_id);
          if (node) {
            (node.governance as unknown as Record<string, number>)[field] = value;
            changed = true;
            await this.log("w", sess.pid, "governance", { node_id, field, value });
          }
        } else if (isFed) {
          if (this.roles["federation"] !== sess.pid) {
            ws.send(JSON.stringify({ t: "error", message: "you don't hold the federation role" }));
            break;
          }
          // Federation dials apply across every node.
          for (const node of this.doc.nodes) {
            (node.governance as unknown as Record<string, number>)[field] = value;
          }
          changed = true;
          await this.log("w", sess.pid, "governance", { scope: "federation", field, value });
        }
        break;
      }
      case "addNode": {
        const id = crypto.randomUUID().slice(0, 6);
        const name = (String(m.name || "New node")).slice(0, 40);
        this.doc.nodes.push(defaultNode(id, name));
        this.roles[`${id}:capital_stack`] = sess.pid; // founder runs the capital stack
        changed = true;
        await this.log("w", sess.pid, "add_node", { id, name });
        break;
      }
    }

    if (changed) {
      await this.persist();
      this.broadcast();
    }
  }
}
