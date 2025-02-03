import JSONBig from "json-bigint";

import {
  BuilderData,
  Data,
  DeserializedAddress,
  NativeScript,
  PlutusDataType,
  PlutusScript,
  PubKeyAddress,
  ScriptAddress,
} from "@meshsdk/common";

import { core } from "../core";

/**
 * Serialize Native script into bech32 address
 * @param script The native script object
 * @param stakeCredentialHash The stake credential hash
 * @param networkId 0 (testnet) or 1 (mainnet). Default to be 0 (testnet).
 * @param isScriptStakeCredential Whether the script is a stake credential. Default to be false.
 * @returns Bech32 address
 */
export const serializeNativeScript = (
  script: NativeScript,
  stakeCredentialHash?: string,
  networkId = 0,
  isScriptStakeCredential = false,
) => {
  if (networkId !== 0 && networkId !== 1) {
    throw new Error("Invalid network id");
  }
  const serializer = new core.CardanoSDKSerializer();
  const { scriptCbor, scriptHash } =
    serializer.deserializer.script.deserializeNativeScript(script);
  const deserializedAddress: Partial<DeserializedAddress> = {
    scriptHash: scriptHash,
  };
  if (isScriptStakeCredential) {
    deserializedAddress.stakeScriptCredentialHash = stakeCredentialHash;
  } else {
    deserializedAddress.stakeCredentialHash = stakeCredentialHash;
  }
  const address = serializer.serializeAddress(deserializedAddress, networkId);
  return { address, scriptCbor };
};

/**
 * Serialize Native script into bech32 address
 * @param script The native script object
 * @param stakeCredentialHash The stake credential hash
 * @param networkId 0 (testnet) or 1 (mainnet). Default to be 0 (testnet).
 * @param isScriptStakeCredential Whether the script is a stake credential. Default to be false.
 * @returns Bech32 address
 */
export const serializePlutusScript = (
  script: PlutusScript,
  stakeCredentialHash?: string,
  networkId = 0,
  isScriptStakeCredential = false,
) => {
  const scriptHash = core
    .deserializePlutusScript(script.code, script.version)
    .hash()
    .toString();
  const address = core.scriptHashToBech32(
    scriptHash,
    stakeCredentialHash,
    networkId,
    isScriptStakeCredential,
  );
  return { address };
};

/**
 * Serialize address in Cardano data JSON format into bech32 address
 * @param address The Cardano address in data JSON format
 * @param networkId 0 (testnet) or 1 (mainnet). Default to be 0 (testnet).
 * @returns Bech32 address
 */
export const serializeAddressObj = (
  address: PubKeyAddress | ScriptAddress,
  networkId = 0,
) => {
  return core.serializeAddressObj(address, networkId);
};

/**
 * Resolve the pool id from hash
 * @param hash The pool hash
 * @returns The pool id
 */
export const serializePoolId = (hash: string) => core.resolvePoolId(hash);

/**
 * Serialize a script hash or key hash into bech32 reward address
 * @param hash The script hash or key hash
 * @param isScriptHash Whether the hash is a script hash
 * @param networkId 0 (testnet) or 1 (mainnet). Default to be 0 (testnet).
 * @returns Bech32 reward address
 */
export const serializeRewardAddress = (
  hash: string,
  isScriptHash = false,
  networkId: 0 | 1 = 0,
) => {
  return isScriptHash
    ? core.scriptHashToRewardAddress(hash, networkId)
    : core.keyHashToRewardAddress(hash, networkId);
};

/**
 * Serialize the data from Mesh or JSON format into CBOR hex
 * @param data The data in Mesh or JSON format
 * @param type The data type
 * @returns The CBOR hex string
 */
export const serializeData = (
  rawData: BuilderData["content"],
  type: Omit<PlutusDataType, "CBOR">,
): string => {
  if (type === "Mesh") {
    return core.toPlutusData(rawData as Data).to_hex();
  }

  let data = rawData;
  if (typeof rawData === "object") {
    data = JSONBig.stringify(data);
  }
  return core.csl.PlutusData.from_json(data as string, 1).to_hex();
};
