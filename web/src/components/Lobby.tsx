import { useState } from "react";

interface Props {
  handle: string;
  onHandle: (h: string) => void;
  onJoin: (room: string) => void;
}

const SUGGESTED = ["norfolk", "richmond", "the-commons"];

function randomCode() {
  return Math.random().toString(36).slice(2, 7);
}

// Each world is its own isolated ledger (a separate Durable Object). Joining a world code
// connects you to that economy; sharing the code lets a group run their own scenario together.
export function Lobby({ handle, onHandle, onJoin }: Props) {
  const [code, setCode] = useState("");
  const go = (c: string) => {
    const slug = c.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (slug) onJoin(slug);
  };

  return (
    <div className="lobby">
      <h1>commune.ai</h1>
      <p className="tag">Federated commune economics, as a multiplayer simulation.</p>

      <div className="lobby-card">
        <label className="select">
          <span>Your handle</span>
          <input value={handle} onChange={(e) => onHandle(e.target.value)} placeholder="who are you?" />
        </label>

        <label className="select">
          <span>World code</span>
          <div className="lobby-join">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="join a world…"
              onKeyDown={(e) => e.key === "Enter" && go(code)}
            />
            <button className="primary" onClick={() => go(code)} disabled={!code.trim()}>Enter</button>
          </div>
        </label>

        <button className="ghost" onClick={() => onJoin(randomCode())}>+ Start a new world</button>

        <div className="lobby-suggested">
          <span className="muted small">or hop into a shared one:</span>
          {SUGGESTED.map((s) => (
            <button key={s} className="chip" onClick={() => onJoin(s)}>{s}</button>
          ))}
        </div>
      </div>

      <p className="muted small lobby-note">
        Each world is an isolated ledger with its own nodes, members, governance, and reserve.
        Share the code (or the link) and a group can run their own scenario together — like a private server.
      </p>
    </div>
  );
}
