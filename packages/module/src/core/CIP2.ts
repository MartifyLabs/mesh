import { csl } from './CSL.js';
import { DEFAULT_PROTOCOL_PARAMETERS } from '../common/constants.js';
import { resolveTxFees } from '../common/utils/index.js';
import type { Protocol, Quantity, Unit, UTxO } from '../common/types/index.js';

export const keepRelevant = (
  requestedOutputSet: Map<Unit, Quantity>,
  initialUTxOSet: UTxO[],
  minimumLovelaceRequired = '5000000'
) => {
  const requestedLovelace = csl.BigNum.from_str(
    requestedOutputSet.get('lovelace') ?? '0'
  ).checked_add(csl.BigNum.from_str(minimumLovelaceRequired));

  const multiAsset = initialUTxOSet.filter((utxo) =>
    utxo.output.amount
      .filter((asset) => asset.unit !== 'lovelace')
      .some((asset) => requestedOutputSet.has(asset.unit))
  );

  const selectedLovelace = selectedLovelaceQuantity(multiAsset);

  const lovelace = selectedLovelace.less_than(requestedLovelace)
    ? remainingLovelace(
        requestedLovelace.clamped_sub(selectedLovelace).to_str(),
        initialUTxOSet.filter((iu) => {
          return !multiAsset.some(
            (su) =>
              su.input.txHash === iu.input.txHash &&
              su.input.outputIndex === iu.input.outputIndex
          );
        })
      )
    : [];

  return [...lovelace, ...multiAsset];
};

export const largestFirst = (
  lovelace: Quantity,
  initialUTxOSet: UTxO[],
  includeTxFees = false,
  { maxTxSize, minFeeA, minFeeB } = DEFAULT_PROTOCOL_PARAMETERS
): UTxO[] => {
  const sortedUTxOs = initialUTxOSet
    .filter((utxo) => multiAssetUTxO(utxo) === false)
    .sort(largestLovelaceQuantity);

  const maxTxFees = csl.BigNum.from_str(
    resolveTxFees(maxTxSize, minFeeA, minFeeB)
  );

  const quantity = includeTxFees
    ? csl.BigNum.from_str(lovelace).checked_add(maxTxFees).to_str()
    : lovelace;

  const requestedOutputSet = new Map<Unit, Quantity>([['lovelace', quantity]]);

  const selection = selectValue(sortedUTxOs, requestedOutputSet);

  return selection;
};

export const largestFirstMultiAsset = (
  requestedOutputSet: Map<Unit, Quantity>,
  initialUTxOSet: UTxO[],
  includeTxFees = false,
  parameters = DEFAULT_PROTOCOL_PARAMETERS
): UTxO[] => {
  const sortedMultiAssetUTxOs = initialUTxOSet
    .filter(multiAssetUTxO)
    .sort(largestLovelaceQuantity);

  const txFees = maxTxFees(parameters);
  const lovelace = requestedOutputSet.get('lovelace') ?? '0';

  const quantity = includeTxFees
    ? csl.BigNum.from_str(lovelace).checked_add(txFees).to_str()
    : lovelace;

  requestedOutputSet.set('lovelace', quantity);

  const selection = selectValue(sortedMultiAssetUTxOs, requestedOutputSet);

  return selection;
};

const enoughValueHasBeenSelected = (
  selection: UTxO[],
  assets: Map<Unit, Quantity>
): boolean => {
  return Array.from(assets, (asset) => ({
    unit: asset[0],
    quantity: csl.BigNum.from_str(asset[1]),
  })).every((asset) => {
    return (
      selection
        .filter((utxo) => {
          return (
            utxo.output.amount.find((a) => a.unit === asset.unit) !== undefined
          );
        })
        .reduce((selectedQuantity, utxo) => {
          const utxoQuantity = utxo.output.amount.reduce(
            (quantity, a) =>
              quantity.checked_add(
                csl.BigNum.from_str(asset.unit === a.unit ? a.quantity : '0')
              ),
            csl.BigNum.from_str('0')
          );

          return selectedQuantity.checked_add(utxoQuantity);
        }, csl.BigNum.from_str('0'))
        .less_than(asset.quantity) === false
    );
  });
};

const largestLovelaceQuantity = (utxoA: UTxO, utxoB: UTxO): number => {
  const aLovelaceQuantity = csl.BigNum.from_str(
    utxoA.output.amount.find((asset) => asset.unit === 'lovelace')?.quantity ??
      '0'
  );

  const bLovelaceQuantity = csl.BigNum.from_str(
    utxoB.output.amount.find((asset) => asset.unit === 'lovelace')?.quantity ??
      '0'
  );

  return bLovelaceQuantity.compare(aLovelaceQuantity);
};

const maxTxFees = (parameters: Protocol) => {
  const { maxTxSize, minFeeA, minFeeB } = parameters;

  return csl.BigNum.from_str(resolveTxFees(maxTxSize, minFeeA, minFeeB));
};

const multiAssetUTxO = (utxo: UTxO): boolean => utxo.output.amount.length > 1;

const selectedLovelaceQuantity = (multiAsset: UTxO[]) => {
  return multiAsset.reduce((sum, utxo) => {
    const lovelace =
      utxo.output.amount.find((asset) => asset.unit === 'lovelace')?.quantity ??
      '0';

    return sum.checked_add(csl.BigNum.from_str(lovelace));
  }, csl.BigNum.from_str('0'));
};

const remainingLovelace = (quantity: Quantity, initialUTxOSet: UTxO[]) => {
  const sortedUTxOs = initialUTxOSet.sort(largestLovelaceQuantity);

  const requestedOutputSet = new Map<Unit, Quantity>([['lovelace', quantity]]);

  const selection = selectValue(sortedUTxOs, requestedOutputSet);

  return selection;
};

const selectValue = (
  inputUTxO: UTxO[],
  outputSet: Map<Unit, Quantity>,
  selection: UTxO[] = []
): UTxO[] => {
  if (
    inputUTxO.length === 0 ||
    enoughValueHasBeenSelected(selection, outputSet)
  ) {
    return selection;
  }

  if (valueCanBeSelected(inputUTxO[0], outputSet)) {
    return selectValue(inputUTxO.slice(1), outputSet, [
      ...selection,
      inputUTxO[0],
    ]);
  }

  return selectValue(inputUTxO.slice(1), outputSet, selection);
};

const valueCanBeSelected = (
  utxo: UTxO,
  assets: Map<Unit, Quantity>
): boolean => {
  return Array.from(assets.keys()).some((unit) => {
    return (
      utxo.output.amount.find((asset) => asset.unit === unit) !== undefined
    );
  });
};
