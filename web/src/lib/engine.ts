import init, {
  compute_node,
  compute_personas,
  compute_enterprise_layer,
  compute_trades_layer,
  compute_tax_layer,
} from "../wasm/commune_model";
// Vite: pass the .wasm URL explicitly so init() finds it after bundling.
import wasmUrl from "../wasm/commune_model_bg.wasm?url";

let ready: Promise<void> | null = null;

/** Initialize the WASM engine once; subsequent calls await the same promise. */
export function initEngine(): Promise<void> {
  if (!ready) ready = init({ module_or_path: wasmUrl }).then(() => undefined);
  return ready;
}

export {
  compute_node,
  compute_personas,
  compute_enterprise_layer,
  compute_trades_layer,
  compute_tax_layer,
};
