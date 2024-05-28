import { mnemonicToEntropy } from 'bip39';
import { AssetFingerprint, csl } from '../../core/index.js';
import {
  SUPPORTED_CLOCKS,
  DEFAULT_PROTOCOL_PARAMETERS,
  SUPPORTED_LANGUAGE_VIEWS,
} from '../../common/constants.js';
import { buildBip32PrivateKey, buildRewardAddress } from './builder.js';
import {
  toAddress,
  toBaseAddress,
  toBytes,
  toEnterpriseAddress,
  toNativeScript,
  toPlutusData,
  toRewardAddress,
  toScriptRef,
} from './converter.js';
import { deserializePlutusScript, deserializeTx } from './deserializer.js';
import type {
  Data,
  Era,
  LanguageVersion,
  NativeScript,
  Network,
  PlutusScript,
} from '../../common/types/index.js';

export const resolveDataHash = (data: Data) => {
  const plutusData = toPlutusData(data);
  const dataHash = csl.hash_plutus_data(plutusData);
  return dataHash.to_hex();
};

export const resolveEpochNo = (network: Network, milliseconds = Date.now()) => {
  if (SUPPORTED_CLOCKS[network]) {
    const [epoch, _, systemStart, epochLength] = SUPPORTED_CLOCKS[network];

    return parseInt(
      csl.BigNum.from_str(milliseconds.toString())
        .div_floor(csl.BigNum.from_str('1000'))
        .checked_sub(csl.BigNum.from_str(systemStart))
        .div_floor(csl.BigNum.from_str(epochLength))
        .checked_add(csl.BigNum.from_str(epoch))
        .to_str(),
      10
    );
  }

  throw new Error(`Couldn't resolve EpochNo for network: ${network}`);
};

export const resolveFingerprint = (policyId: string, assetName: string) => {
  return AssetFingerprint.fromParts(
    toBytes(policyId),
    toBytes(assetName)
  ).fingerprint();
};

export const resolveLanguageView = (era: Era, version: LanguageVersion) => {
  return SUPPORTED_LANGUAGE_VIEWS[era][version];
};

export const resolveNativeScriptAddress = (script: NativeScript, networkId = 0) => {
  const nativeScript = toNativeScript(script);

  const enterpriseAddress = csl.EnterpriseAddress.new(networkId,
    csl.StakeCredential.from_scripthash(nativeScript.hash()),
  );

  return enterpriseAddress.to_address().to_bech32();

}

export const resolveNativeScriptHash = (script: NativeScript) => {
  return toNativeScript(script).hash().to_hex();
};

export const resolvePaymentKeyHash = (bech32: string) => {
  try {
    const paymentKeyHash = [
      toBaseAddress(bech32)?.payment_cred().to_keyhash(),
      toEnterpriseAddress(bech32)?.payment_cred().to_keyhash(),
    ].find((kh) => kh !== undefined);

    if (paymentKeyHash !== undefined) return paymentKeyHash.to_hex();

    throw new Error(
      `Couldn't resolve payment key hash from address: ${bech32}`
    );
  } catch (error) {
    throw new Error(
      `An error occurred during resolvePaymentKeyHash: ${error}.`
    );
  }
};

export const resolvePlutusScriptAddress = (
  script: PlutusScript,
  networkId = 0
) => {
  const plutusScript = deserializePlutusScript(script.code, script.version);

  const enterpriseAddress = csl.EnterpriseAddress.new(
    networkId,
    csl.StakeCredential.from_scripthash(plutusScript.hash())
  );

  return enterpriseAddress.to_address().to_bech32();
};

export const resolvePlutusScriptHash = (bech32: string) => {
  try {
    const enterpriseAddress = toEnterpriseAddress(bech32);
    const scriptHash = enterpriseAddress?.payment_cred().to_scripthash();

    if (scriptHash !== undefined) return scriptHash.to_hex();

    throw new Error(`Couldn't resolve script hash from address: ${bech32}`);
  } catch (error) {
    throw new Error(`An error occurred during resolveScriptHash: ${error}.`);
  }
};

export const resolvePoolId = (hash: string) => {
  return csl.Ed25519KeyHash.from_hex(hash).to_bech32('pool1');
};

export const resolvePrivateKey = (words: string[]) => {
  const entropy = mnemonicToEntropy(words.join(' '));
  const bip32PrivateKey = buildBip32PrivateKey(entropy);
  const bech32PrivateKey = bip32PrivateKey.to_bech32();

  bip32PrivateKey.free();

  return bech32PrivateKey;
};

export const resolveScriptRef = (script: PlutusScript | NativeScript) => {
  return toScriptRef(script).to_hex();
};

export const resolveSlotNo = (network: Network, milliseconds = Date.now()) => {
  if (SUPPORTED_CLOCKS[network]) {
    const [_, slot, systemStart] = SUPPORTED_CLOCKS[network];

    return csl.BigNum.from_str(milliseconds.toString())
      .div_floor(csl.BigNum.from_str('1000'))
      .checked_sub(csl.BigNum.from_str(systemStart))
      .checked_add(csl.BigNum.from_str(slot))
      .to_str();
  }

  throw new Error(`Couldn't resolve SlotNo for network: ${network}`);
};

export const resolveRewardAddress = (bech32: string) => {
  try {
    const address = toAddress(bech32);
    const baseAddress = toBaseAddress(bech32);
    const stakeKeyHash = baseAddress?.stake_cred().to_keyhash();

    if (stakeKeyHash !== undefined)
      return buildRewardAddress(address.network_id(), stakeKeyHash)
        .to_address()
        .to_bech32();

    throw new Error(`Couldn't resolve reward address from address: ${bech32}`);
  } catch (error) {
    throw new Error(`An error occurred during resolveRewardAddress: ${error}.`);
  }
};

export const resolveStakeKeyHash = (bech32: string) => {
  try {
    const stakeKeyHash = [
      toBaseAddress(bech32)?.stake_cred().to_keyhash(),
      toRewardAddress(bech32)?.payment_cred().to_keyhash(),
    ].find((kh) => kh !== undefined);

    if (stakeKeyHash !== undefined) return stakeKeyHash.to_hex();

    throw new Error(`Couldn't resolve stake key hash from address: ${bech32}`);
  } catch (error) {
    throw new Error(`An error occurred during resolveStakeKeyHash: ${error}.`);
  }
};

export const resolveTxFees = (
  txSize: number,
  minFeeA = DEFAULT_PROTOCOL_PARAMETERS.minFeeA,
  minFeeB = DEFAULT_PROTOCOL_PARAMETERS.minFeeB
) => {
  const fees = BigInt(minFeeA) * BigInt(txSize) + BigInt(minFeeB);

  return fees.toString();
};

export const resolveTxHash = (txHex: string) => {
  const txBody = deserializeTx(txHex).body();
  const txHash = csl.hash_transaction(txBody);
  return txHash.to_hex();
};
