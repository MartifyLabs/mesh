import { csl } from '../../core/index.js';
import { LANGUAGE_VERSIONS } from '../../common/constants.js';
import { toBytes } from './converter.js';
import type { LanguageVersion } from '../../common/types/index.js';

export const deserializeAddress = (address: string) =>
  csl.Address.from_bytes(toBytes(address));

export const deserializeBip32PrivateKey = (bip32PrivateKey: string) =>
  csl.Bip32PrivateKey.from_bytes(toBytes(bip32PrivateKey));

export const deserializeDataHash = (dataHash: string) =>
  csl.DataHash.from_bytes(toBytes(dataHash));

export const deserializeEd25519KeyHash = (ed25519KeyHash: string) =>
  csl.Ed25519KeyHash.from_bytes(toBytes(ed25519KeyHash));

export const deserializeEd25519Signature = (ed25519Signature: string) =>
  csl.Ed25519Signature.from_bytes(toBytes(ed25519Signature));

export const deserializeNativeScript = (nativeScript: string) =>
  csl.NativeScript.from_bytes(toBytes(nativeScript));

export const deserializePublicKey = (publicKey: string) =>
  csl.PublicKey.from_bytes(toBytes(publicKey));

export const deserializePlutusData = (plutusData: string) =>
  csl.PlutusData.from_bytes(toBytes(plutusData));

export const deserializePlutusScript = (
  plutusScript: string,
  version: LanguageVersion
) =>
  csl.PlutusScript.from_bytes_with_version(
    toBytes(plutusScript),
    LANGUAGE_VERSIONS[version]
  );

export const deserializeScriptRef = (scriptRef: string) =>
  csl.ScriptRef.from_bytes(toBytes(scriptRef));

export const deserializeScriptHash = (scriptHash: string) =>
  csl.ScriptHash.from_bytes(toBytes(scriptHash));

export const deserializeTx = (tx: string) =>
  csl.Transaction.from_bytes(toBytes(tx));

export const deserializeTxBody = (txBody: string) =>
  csl.TransactionBody.from_bytes(toBytes(txBody));

export const deserializeTxHash = (txHash: string) =>
  csl.TransactionHash.from_bytes(toBytes(txHash));

export const deserializeTxUnspentOutput = (txUnspentOutput: string) =>
  csl.TransactionUnspentOutput.from_bytes(toBytes(txUnspentOutput));

export const deserializeTxWitnessSet = (txWitnessSet: string) =>
  csl.TransactionWitnessSet.from_bytes(toBytes(txWitnessSet));

export const deserializeValue = (value: string) =>
  csl.Value.from_bytes(toBytes(value));
