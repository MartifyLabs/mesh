import type { OpaqueString } from "@cardano-sdk/util";
import { Cardano, Serialization } from "@cardano-sdk/core";
import * as Crypto from "@cardano-sdk/crypto";
import { typedHex } from "@cardano-sdk/util";

export const Slot = Cardano.Slot;
export type Slot = Cardano.Slot;

export const Value = Serialization.Value;
export type Value = Serialization.Value;

export type TokenMap = Cardano.TokenMap;

export const Transaction = Serialization.Transaction;
export type Transaction = Serialization.Transaction;

export const TransactionId = Cardano.TransactionId;
export type TransactionId = Cardano.TransactionId;

export const TransactionBody = Serialization.TransactionBody;
export type TransactionBody = Serialization.TransactionBody;

export const TransactionWitnessSet = Serialization.TransactionWitnessSet;
export type TransactionWitnessSet = Serialization.TransactionWitnessSet;

export const AuxilliaryData = Serialization.AuxiliaryData;
export type AuxiliaryData = Serialization.AuxiliaryData;

export const TransactionMetadatum = Serialization.TransactionMetadatum;
export type TransactionMetadatum = Serialization.TransactionMetadatum;

export const MetadatumMap = Serialization.MetadatumMap;
export type MetadatumMap = Serialization.MetadatumMap;

export const MetadatumList = Serialization.MetadatumList;
export type MetadatumList = Serialization.MetadatumList;

export const TransactionUnspentOutput = Serialization.TransactionUnspentOutput;
export type TransactionUnspentOutput = Serialization.TransactionUnspentOutput;

export const TransactionInput = Serialization.TransactionInput;
export type TransactionInput = Serialization.TransactionInput;

export const TransactionOutput = Serialization.TransactionOutput;
export type TransactionOutput = Serialization.TransactionOutput;

export type TransactionInputSet = Serialization.CborSet<
  ReturnType<TransactionInput["toCore"]>,
  TransactionInput
>;

export type TransactionWitnessPlutusData = Set<PlutusData>;

export const PlutusData = Serialization.PlutusData;
export type PlutusData = Serialization.PlutusData;

export const PlutusList = Serialization.PlutusList;
export type PlutusList = Serialization.PlutusList;

export const PlutusMap = Serialization.PlutusMap;
export type PlutusMap = Serialization.PlutusMap;

export const Redeemers = Serialization.Redeemers;
export type Redeemers = Serialization.Redeemers;

export const Redeemer = Serialization.Redeemer;
export type Redeemer = Serialization.Redeemer;

export const RedeemerPurpose = Cardano.RedeemerPurpose;
export type RedeemerPurpose = Cardano.RedeemerPurpose;

export const RedeemerTag = Serialization.RedeemerTag;
export type RedeemerTag = Serialization.RedeemerTag;

export const Script = Serialization.Script;
export type Script = Serialization.Script;

export const PolicyId = Cardano.PolicyId;
export type PolicyId = Cardano.PolicyId;

export const AssetName = Cardano.AssetName;
export type AssetName = Cardano.AssetName;

export const AssetId = Cardano.AssetId;
export type AssetId = Cardano.AssetId;

export const ScriptHash = Crypto.Hash28ByteBase16;
export type ScriptHash = Crypto.Hash28ByteBase16;

export const Address = Cardano.Address;
export type Address = Cardano.Address;

export const RewardAddress = Cardano.RewardAddress;
export type RewardAddress = Cardano.RewardAddress;

export const AddressType = Cardano.AddressType;
export type AddressType = Cardano.AddressType;

export const BaseAddress = Cardano.BaseAddress;
export type BaseAddress = Cardano.BaseAddress;

export const EnterpriseAddress = Cardano.EnterpriseAddress;
export type EnterpriseAddress = Cardano.EnterpriseAddress;

export const PaymentAddress = Cardano.PaymentAddress;
export type PaymentAddress = Cardano.PaymentAddress;

export const AssetFingerprint = Cardano.AssetFingerprint;
export type AssetFingerprint = Cardano.AssetFingerprint;

export const Credential = Serialization.Credential;
export type Credential = Serialization.Credential;

export type CredentialCore = Cardano.Credential;

export const Ed25519PublicKeyHex = Crypto.Ed25519PublicKeyHex;
export type Ed25519PublicKeyHex = Crypto.Ed25519PublicKeyHex;

export type Ed25519PrivateNormalKeyHex = OpaqueString<"Ed25519PrivateKeyHex">;
export const Ed25519PrivateNormalKeyHex = (
  value: string,
): Ed25519PrivateNormalKeyHex => typedHex(value, 64);

export type Ed25519PrivateExtendedKeyHex = OpaqueString<"Ed25519PrivateKeyHex">;
export const Ed25519PrivateExtendedKeyHex = (
  value: string,
): Ed25519PrivateExtendedKeyHex => typedHex(value, 128);

export const Ed25519KeyHash = Crypto.Ed25519KeyHash;
export type Ed25519KeyHash = Crypto.Ed25519KeyHash;

export const Ed25519KeyHashHex = Crypto.Ed25519KeyHashHex;
export type Ed25519KeyHashHex = Crypto.Ed25519KeyHashHex;

export const Hash28ByteBase16 = Crypto.Hash28ByteBase16;
export type Hash28ByteBase16 = Crypto.Hash28ByteBase16;

export const Hash32ByteBase16 = Crypto.Hash32ByteBase16;
export type Hash32ByteBase16 = Crypto.Hash32ByteBase16;

export const CredentialType = Cardano.CredentialType;
export type CredentialType = Cardano.CredentialType;

export const Certificate = Serialization.Certificate;
export type Certificate = Serialization.Certificate;

export const PoolId = Cardano.PoolId;
export type PoolId = Cardano.PoolId;

export const StakeRegistration = Serialization.StakeRegistration;
export type StakeRegistration = Serialization.StakeRegistration;

export const StakeDelegation = Serialization.StakeDelegation;
export type StakeDelegation = Serialization.StakeDelegation;

export type StakeDelegationCertificate = Cardano.StakeDelegationCertificate;

export const CertificateType = Cardano.CertificateType;
export type CertificateType = Cardano.CertificateType;

export const VkeyWitness = Serialization.VkeyWitness;
export type VkeyWitness = Serialization.VkeyWitness;

export const Ed25519SignatureHex = Crypto.Ed25519SignatureHex;
export type Ed25519SignatureHex = Crypto.Ed25519SignatureHex;

export const Ed25519PublicKey = Crypto.Ed25519PublicKey;
export type Ed25519PublicKey = Crypto.Ed25519PublicKey;

export const Ed25519Signature = Crypto.Ed25519Signature;
export type Ed25519Signature = Crypto.Ed25519Signature;

export const Bip32PrivateKey = Crypto.Bip32PrivateKey;
export type Bip32PrivateKey = Crypto.Bip32PrivateKey;

export const Bip32PrivateKeyHex = Crypto.Bip32PrivateKeyHex;
export type Bip32PrivateKeyHex = Crypto.Bip32PrivateKeyHex;

export const PlutusLanguageVersion = Cardano.PlutusLanguageVersion;
export type PlutusLanguageVersion = Cardano.PlutusLanguageVersion;

export const NativeScript = Serialization.NativeScript;
export type NativeScript = Serialization.NativeScript;

export const PlutusV1Script = Serialization.PlutusV1Script;
export type PlutusV1Script = Serialization.PlutusV1Script;

export const PlutusV2Script = Serialization.PlutusV2Script;
export type PlutusV2Script = Serialization.PlutusV2Script;

export const PlutusV3Script = Serialization.PlutusV3Script;
export type PlutusV3Script = Serialization.PlutusV3Script;

export const PlutusDataKind = Serialization.PlutusDataKind;
export type PlutusDataKind = Serialization.PlutusDataKind;

export const PointerAddress = Cardano.PointerAddress;
export type PointerAddress = Cardano.PointerAddress;

export const CertIndex = Cardano.CertIndex;
export type CertIndex = Cardano.CertIndex;

export const TxIndex = Cardano.TxIndex;
export type TxIndex = Cardano.TxIndex;

export const Costmdls = Serialization.Costmdls;
export type Costmdls = Serialization.Costmdls;

export const CostModel = Serialization.CostModel;
export type CostModel = Serialization.CostModel;

export const CborWriter = Serialization.CborWriter;
export type CborWriter = Serialization.CborWriter;

export const ConstrPlutusData = Serialization.ConstrPlutusData;
export type ConstrPlutusData = Serialization.ConstrPlutusData;

export const RewardAccount = Cardano.RewardAccount;
export type RewardAccount = Cardano.RewardAccount;

export const Hash = Serialization.Hash;
export type Hash<T extends string> = Serialization.Hash<T>;

export const DatumHash = Crypto.Hash32ByteBase16;
export type DatumHash = Crypto.Hash32ByteBase16;

export const Datum = Serialization.Datum;
export type Datum = PlutusData | DatumHash;

export type CostModels = Cardano.CostModels;

export type ExUnits = Serialization.ExUnits;
export const ExUnits = Serialization.ExUnits;

export const NetworkId = Cardano.NetworkId;
export type NetworkId = Cardano.ChainId["networkId"];

export const DatumKind = Serialization.DatumKind;

export const CborSet = Serialization.CborSet;

export type Witness = Cardano.Witness;
export type Signatures = Cardano.Signatures;

export type RequireAllOf = Cardano.NativeScriptKind.RequireAllOf;
export const RequireAllOf = Cardano.NativeScriptKind.RequireAllOf;

export type RequireAnyOf = Cardano.NativeScriptKind.RequireAnyOf;
export const RequireAnyOf = Cardano.NativeScriptKind.RequireAnyOf;

export type RequireNOf = Cardano.NativeScriptKind.RequireNOf;
export const RequireNOf = Cardano.NativeScriptKind.RequireNOf;

export type RequireSignature = Cardano.NativeScriptKind.RequireSignature;
export const RequireSignature = Cardano.NativeScriptKind.RequireSignature;

export type RequireTimeAfter = Cardano.NativeScriptKind.RequireTimeAfter;
export const RequireTimeAfter = Cardano.NativeScriptKind.RequireTimeAfter;

export type RequireTimeBefore = Cardano.NativeScriptKind.RequireTimeBefore;
export const RequireTimeBefore = Cardano.NativeScriptKind.RequireTimeBefore;

export type VrfVkBech32 = Cardano.VrfVkBech32;
export const VrfVkBech32 = Cardano.VrfVkBech32;

export type ScriptPubkey = Serialization.ScriptPubkey;
export const ScriptPubkey = Serialization.ScriptPubkey;

export type DRepID = Cardano.DRepID;
export const DRepID = Cardano.DRepID;

export type DRep = Serialization.DRep;
export const DRep = Serialization.DRep;

export type StakeCredentialStatus = Cardano.StakeCredentialStatus;
export const StakeCredentialStatus = Cardano.StakeCredentialStatus;

export type Metadatum = Cardano.Metadatum;

export const computeAuxiliaryDataHash = Cardano.computeAuxiliaryDataHash;

export type BootstrapWitness = Serialization.BootstrapWitness;
export const BootstrapWitness = Serialization.BootstrapWitness;

export type ByronAttributes = Cardano.ByronAttributes;
