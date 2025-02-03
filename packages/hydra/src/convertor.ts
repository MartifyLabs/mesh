import { Asset, UTxO } from "@meshsdk/common";

import { HydraAssets, HydraUTxO } from "./types";

export function toUTxO(hUTxO: HydraUTxO, txId: string): UTxO {
  const [txHash, txIndex] = txId.split("#");

  // doing this has wasm error
  // const inlineDatum = hUTxO.inlineDatum
  //   ? csl.PlutusData.from_json(JSONBig.stringify(hUTxO.inlineDatum), 1).to_hex()
  //   : undefined;

  return {
    input: {
      outputIndex: Number(txIndex),
      txHash: txHash!,
    },
    output: {
      address: hUTxO.address,
      amount: toAssets(hUTxO.value),
      dataHash: hUTxO.datumhash ?? undefined,
      plutusData: hUTxO.inlineDatum?.toString() ?? undefined,
      scriptHash: hUTxO.referenceScript?.toString() ?? undefined,
    },
  };
}

export function toAssets(hAssets: HydraAssets): Asset[] {
  const assets: Asset[] = [];
  for (const policy of Object.keys(hAssets)) {
    if (policy === "lovelace") {
      assets.push({
        unit: policy,
        quantity: hAssets[policy].toString(),
      });
    } else {
      for (const assetName of Object.keys(hAssets[policy]!)) {
        assets.push({
          unit: policy + assetName,
          quantity: hAssets[policy]![assetName]!.toString(),
        });
      }
    }
  }
  return assets;
}

export function toHydraAssets(assets: Asset[]): HydraAssets {
  const hAssets: HydraAssets = {
    lovelace: 0,
  } as HydraAssets;
  for (const asset of assets) {
    if (asset.unit === "" || asset.unit === "lovelace") {
      hAssets["lovelace"] = Number(asset.quantity);
    } else {
      hAssets[asset.unit.slice(0, 56)] = {
        [asset.unit.slice(56)]: Number(asset.quantity),
      };
    }
  }
  return hAssets;
}
