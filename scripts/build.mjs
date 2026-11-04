/**
 * Build the client half into the exact shape the DSH Web client runtime expects.
 *
 * A client plugin is a CommonJS bundle wrapped in `window.__ModuleLoader__.load`:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => { … return module.exports } })
 *
 * Inside that factory `require` resolves the host-provided singletons (react,
 * react-dom, the ui-primitives package, …), so every one of them must stay
 * EXTERNAL — bundling a second copy of React would break hooks.
 */
import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

const ID = "dsh-quote-ask";

/**
 * The host half is plain ESM with no imports, so it needs no bundling — but it
 * still has to LAND in lib/, which is what package.json main points at. Shipping
 * only lib/client.js leaves the roster entry unable to import ("failed to import").
 */
function buildHost() {
  mkdirSync("lib", { recursive: true });
  copyFileSync("src/index.js", "lib/index.js");
  console.log("lib/index.js  host half copied");
}

/** Host-provided singletons: resolved by the loader, never bundled. */
const EXTERNAL = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react-dom/client",
  "@deepseek-ai/*",
];

const options = {
  entryPoints: ["src/client/index.jsx"],
  outfile: "lib/client.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "chrome120",
  jsx: "automatic",
  external: EXTERNAL,
  legalComments: "inline",
  logLevel: "info",
  banner: {
    js: `window.__ModuleLoader__.load({
	id: ${JSON.stringify(ID)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
`,
  },
  footer: {
    js: `
		return module.exports;
	}
});`,
  },
};

if (process.argv.includes("--watch")) {
  buildHost();
  const ctx = await context(options);
  await ctx.watch();
  console.log(`watching src/client → lib/client.js`);
} else {
  buildHost();
  await build(options);
}
