import type { Quantity, UTxO, Unit } from '../common/types/index.js';

export const selectUtxos = (
  inputs: UTxO[],
  requiredAssets: Map<Unit, Quantity>,
  threshold: Quantity
): UTxO[] => {
  const totalRequiredAssets = new Map<Unit, Quantity>(requiredAssets);
  totalRequiredAssets.set(
    'lovelace',
    String(Number(totalRequiredAssets.get('lovelace')) + Number(threshold))
  );
  const utxoMap = new Map<number, UTxO>();
  for (let i = 0; i < inputs.length; i++) {
    utxoMap.set(i, inputs[i]);
  }
  const selectedInputs = new Set<number>();
  const onlyLovelace = new Set<number>();
  const singletons = new Set<number>();
  const pairs = new Set<number>();
  const rest = new Set<number>();
  for (let i = 0; i < inputs.length; i++) {
    switch (inputs[i].output.amount.length) {
      case 1: {
        onlyLovelace.add(i);
        break;
      }
      case 2: {
        singletons.add(i);
        break;
      }
      case 3: {
        pairs.add(i);
        break;
      }
      default: {
        rest.add(i);
        break;
      }
    }
  }

  const addUtxoWithAssetAmount = (
    inputIndex: number,
    assetUnit: string,
    set: Set<number>
  ) => {
    const utxo = utxoMap.get(inputIndex);
    if (!utxo) return;

    const amount = getAssetAmount(utxo, assetUnit);
    if (Number(amount) > 0) {
      selectedInputs.add(inputIndex);
      set.delete(inputIndex);
      for (const asset of utxo.output.amount) {
        totalRequiredAssets.set(
          asset.unit,
          String(
            Number(totalRequiredAssets.get(asset.unit)) - Number(asset.quantity)
          )
        );
      }
    }
  };

  for (const assetUnit of totalRequiredAssets.keys()) {
    if (assetUnit == 'lovelace') continue;
    for (const inputIndex of singletons) {
      const assetRequired = totalRequiredAssets.get(assetUnit);
      if (!assetRequired || Number(assetRequired) <= 0) break;
      addUtxoWithAssetAmount(inputIndex, assetUnit, singletons);
    }

    for (const inputIndex of pairs) {
      const assetRequired = totalRequiredAssets.get(assetUnit);
      if (!assetRequired || Number(assetRequired) <= 0) break;
      addUtxoWithAssetAmount(inputIndex, assetUnit, pairs);
    }

    for (const inputIndex of rest) {
      const assetRequired = totalRequiredAssets.get(assetUnit);
      if (!assetRequired || Number(assetRequired) <= 0) break;
      addUtxoWithAssetAmount(inputIndex, assetUnit, rest);
    }
  }

  for (const inputIndex of onlyLovelace) {
    const assetRequired = totalRequiredAssets.get('lovelace');
    if (!assetRequired || Number(assetRequired) <= 0) break;
    addUtxoWithAssetAmount(inputIndex, 'lovelace', onlyLovelace);
  }

  for (const inputIndex of singletons) {
    const assetRequired = totalRequiredAssets.get('lovelace');
    if (!assetRequired || Number(assetRequired) <= 0) break;
    addUtxoWithAssetAmount(inputIndex, 'lovelace', singletons);
  }

  for (const inputIndex of pairs) {
    const assetRequired = totalRequiredAssets.get('lovelace');
    if (!assetRequired || Number(assetRequired) <= 0) break;
    addUtxoWithAssetAmount(inputIndex, 'lovelace', pairs);
  }

  for (const inputIndex of rest) {
    const assetRequired = totalRequiredAssets.get('lovelace');
    if (!assetRequired || Number(assetRequired) <= 0) break;
    addUtxoWithAssetAmount(inputIndex, 'lovelace', rest);
  }

  for (const assetUnit of totalRequiredAssets.keys()) {
    if (Number(totalRequiredAssets.get(assetUnit)) > 0) return [];
  }

  const selectedUtxos: UTxO[] = [];
  for (const inputIndex of selectedInputs) {
    const utxo = utxoMap.get(inputIndex);
    if (utxo) {
      selectedUtxos.push(utxo);
    }
  }
  return selectedUtxos;
};

const getAssetAmount = (utxo: UTxO, assetUnit: string): string => {
  for (const utxoAsset of utxo.output.amount) {
    if (utxoAsset.unit == assetUnit) return utxoAsset.quantity;
  }
  return '0';
};
