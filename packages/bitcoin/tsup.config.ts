import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "bip32",
    "ecpair",
    "@bitcoin-js/tiny-secp256k1-asmjs",
    "bitcoinjs-lib",
  ],
  noExternal: ["@meshsdk/bitcoin"],
  esbuildOptions(options) {
    options.define = {
      global: "globalThis",
      process: JSON.stringify({
        env: {
          NODE_ENV: "production",
        },
      }),
    };
    options.platform = "browser";
  },
});