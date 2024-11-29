import { MeshTxBuilderBody, validityRangeToObj } from "@meshsdk/common";

import { certificateToObj } from "./certificate";
import { mintItemToObj } from "./mint";
import { outputToObj } from "./output";
import { collateralTxInToObj, txInToObj } from "./txIn";
import { voteToObj } from "./vote";
import { withdrawalToObj } from "./withdrawal";
import { networkToObj } from "./network";

export const meshTxBuilderBodyToObj = ({
  inputs,
  outputs,
  collaterals,
  requiredSignatures,
  referenceInputs,
  mints,
  changeAddress,
  metadata,
  validityRange,
  certificates,
  signingKey,
  withdrawals,
  votes,
  network,
}: MeshTxBuilderBody) => {
  return {
    inputs: inputs.map(txInToObj),
    outputs: outputs.map(outputToObj),
    collaterals: collaterals.map(collateralTxInToObj),
    requiredSignatures,
    referenceInputs: referenceInputs,
    mints: mints.map((mint) => mintItemToObj(mint)),
    changeAddress,
    metadata: metadata,
    validityRange: validityRangeToObj(validityRange),
    certificates: certificates.map(certificateToObj),
    signingKey: signingKey,
    withdrawals: withdrawals.map(withdrawalToObj),
    votes: votes.map(voteToObj),
    network: networkToObj(network),
  };
};

export * from "./certificate";
export * from "./data";
export * from "./mint";
export * from "./output";
export * from "./script";
export * from "./txIn";
export * from "./utxo";
export * from "./withdrawal";
