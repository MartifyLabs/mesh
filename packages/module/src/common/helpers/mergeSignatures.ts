import { csl } from '../../core/index.js';
import type {
  TransactionWitnessSet,
  Vkeywitnesses,
} from '../..//core/index.js';

export const mergeSignatures = (
  txWitnessSet: TransactionWitnessSet,
  newSignatures: Vkeywitnesses
) => {
  const txSignatures = txWitnessSet.vkeys();

  if (txSignatures !== undefined) {
    const signatures = new Set<string>();

    for (let index = 0; index < txSignatures.len(); index += 1) {
      signatures.add(txSignatures.get(index).to_hex());
    }

    for (let index = 0; index < newSignatures.len(); index += 1) {
      signatures.add(newSignatures.get(index).to_hex());
    }

    const allSignatures = csl.Vkeywitnesses.new();
    signatures.forEach((witness) => {
      allSignatures.add(csl.Vkeywitness.from_hex(witness));
    });

    return allSignatures;
  }

  return newSignatures;
};
