import { World } from "./world";

export { World };

interface Env {
  WORLD: DurableObjectNamespace;
  ASSETS: Fetcher;
  DB?: D1Database;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      // One world per room; everyone in a room shares the same Durable Object instance.
      const room = url.searchParams.get("room") || "main";
      const id = env.WORLD.idFromName(room);
      return env.WORLD.get(id).fetch(req);
    }

    // Everything else is the static frontend (SPA fallback handled by the assets binding).
    return env.ASSETS.fetch(req);
  },
};
