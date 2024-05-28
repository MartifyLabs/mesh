import { csl } from './CSL.js';

export * as csl from '@emurgo/cardano-serialization-lib-nodejs';

export type Address = InstanceType<typeof csl.Address>;
export type AssetName = InstanceType<typeof csl.AssetName>;
export type AssetNames = InstanceType<typeof csl.AssetNames>;
export type Assets = InstanceType<typeof csl.Assets>;
export type AuxiliaryData = InstanceType<typeof csl.AuxiliaryData>;
export type AuxiliaryDataHash = InstanceType<typeof csl.AuxiliaryDataHash>;
export type AuxiliaryDataSet = InstanceType<typeof csl.AuxiliaryDataSet>;
export type BaseAddress = InstanceType<typeof csl.BaseAddress>;
export type BigInt = InstanceType<typeof csl.BigInt>;
export type BigNum = InstanceType<typeof csl.BigNum>;
export type Bip32PrivateKey = InstanceType<typeof csl.Bip32PrivateKey>;
export type Bip32PublicKey = InstanceType<typeof csl.Bip32PublicKey>;
export type Block = InstanceType<typeof csl.Block>;
export type BlockHash = InstanceType<typeof csl.BlockHash>;
export type BootstrapWitness = InstanceType<typeof csl.BootstrapWitness>;
export type BootstrapWitnesses = InstanceType<typeof csl.BootstrapWitnesses>;
export type ByronAddress = InstanceType<typeof csl.ByronAddress>;
export type Certificate = InstanceType<typeof csl.Certificate>;
export type Certificates = InstanceType<typeof csl.Certificates>;
export type ConstrPlutusData = InstanceType<typeof csl.ConstrPlutusData>;
export type CostModel = InstanceType<typeof csl.CostModel>;
export type Costmdls = InstanceType<typeof csl.Costmdls>;
export type DNSRecordAorAAAA = InstanceType<typeof csl.DNSRecordAorAAAA>;
export type DNSRecordSRV = InstanceType<typeof csl.DNSRecordSRV>;
export type DataCost = InstanceType<typeof csl.DataCost>;
export type DataHash = InstanceType<typeof csl.DataHash>;
export type DatumSource = InstanceType<typeof csl.DatumSource>;
export type Ed25519KeyHash = InstanceType<typeof csl.Ed25519KeyHash>;
export type Ed25519KeyHashes = InstanceType<typeof csl.Ed25519KeyHashes>;
export type Ed25519Signature = InstanceType<typeof csl.Ed25519Signature>;
export type EnterpriseAddress = InstanceType<typeof csl.EnterpriseAddress>;
export type ExUnitPrices = InstanceType<typeof csl.ExUnitPrices>;
export type ExUnits = InstanceType<typeof csl.ExUnits>;
export type GeneralTransactionMetadata = InstanceType<
  typeof csl.GeneralTransactionMetadata
>;
export type GenesisDelegateHash = InstanceType<typeof csl.GenesisDelegateHash>;
export type GenesisHash = InstanceType<typeof csl.GenesisHash>;
export type GenesisHashes = InstanceType<typeof csl.GenesisHashes>;
export type GenesisKeyDelegation = InstanceType<
  typeof csl.GenesisKeyDelegation
>;
export type Header = InstanceType<typeof csl.Header>;
export type HeaderBody = InstanceType<typeof csl.HeaderBody>;
export type Int = InstanceType<typeof csl.Int>;
export type Ipv4 = InstanceType<typeof csl.Ipv4>;
export type Ipv6 = InstanceType<typeof csl.Ipv6>;
export type KESSignature = InstanceType<typeof csl.KESSignature>;
export type KESVKey = InstanceType<typeof csl.KESVKey>;
export type Language = InstanceType<typeof csl.Language>;
export type Languages = InstanceType<typeof csl.Languages>;
export type LegacyDaedalusPrivateKey = InstanceType<
  typeof csl.LegacyDaedalusPrivateKey
>;
export type LinearFee = InstanceType<typeof csl.LinearFee>;
export type MIRToStakeCredentials = InstanceType<
  typeof csl.MIRToStakeCredentials
>;
export type MetadataList = InstanceType<typeof csl.MetadataList>;
export type MetadataMap = InstanceType<typeof csl.MetadataMap>;
export type Mint = InstanceType<typeof csl.Mint>;
export type MintAssets = InstanceType<typeof csl.MintAssets>;
export type MintBuilder = InstanceType<typeof csl.MintBuilder>;
export type MintWitness = InstanceType<typeof csl.MintWitness>;
export type MintsAssets = InstanceType<typeof csl.MintsAssets>;
export type MoveInstantaneousReward = InstanceType<
  typeof csl.MoveInstantaneousReward
>;
export type MoveInstantaneousRewardsCert = InstanceType<
  typeof csl.MoveInstantaneousRewardsCert
>;
export type MultiAsset = InstanceType<typeof csl.MultiAsset>;
export type MultiHostName = InstanceType<typeof csl.MultiHostName>;
export type NativeScript = InstanceType<typeof csl.NativeScript>;
export type NativeScripts = InstanceType<typeof csl.NativeScripts>;
export type NetworkId = InstanceType<typeof csl.NetworkId>;
export type NetworkInfo = InstanceType<typeof csl.NetworkInfo>;
export type Nonce = InstanceType<typeof csl.Nonce>;
export type OperationalCert = InstanceType<typeof csl.OperationalCert>;
export type PlutusData = InstanceType<typeof csl.PlutusData>;
export type PlutusList = InstanceType<typeof csl.PlutusList>;
export type PlutusMap = InstanceType<typeof csl.PlutusMap>;
export type PlutusScript = InstanceType<typeof csl.PlutusScript>;
export type PlutusScripts = InstanceType<typeof csl.PlutusScripts>;
export type PlutusScriptSource = InstanceType<typeof csl.PlutusScriptSource>;
export type PlutusWitness = InstanceType<typeof csl.PlutusWitness>;
export type PlutusWitnesses = InstanceType<typeof csl.PlutusWitnesses>;
export type Pointer = InstanceType<typeof csl.Pointer>;
export type PointerAddress = InstanceType<typeof csl.PointerAddress>;
export type PoolMetadata = InstanceType<typeof csl.PoolMetadata>;
export type PoolMetadataHash = InstanceType<typeof csl.PoolMetadataHash>;
export type PoolParams = InstanceType<typeof csl.PoolParams>;
export type PoolRegistration = InstanceType<typeof csl.PoolRegistration>;
export type PoolRetirement = InstanceType<typeof csl.PoolRetirement>;
export type PrivateKey = InstanceType<typeof csl.PrivateKey>;
export type ProposedProtocolParameterUpdates = InstanceType<
  typeof csl.ProposedProtocolParameterUpdates
>;
export type ProtocolParamUpdate = InstanceType<typeof csl.ProtocolParamUpdate>;
export type ProtocolVersion = InstanceType<typeof csl.ProtocolVersion>;
export type PublicKey = InstanceType<typeof csl.PublicKey>;
export type PublicKeys = InstanceType<typeof csl.PublicKeys>;
export type Redeemer = InstanceType<typeof csl.Redeemer>;
export type RedeemerTag = InstanceType<typeof csl.RedeemerTag>;
export type Redeemers = InstanceType<typeof csl.Redeemers>;
export type Relay = InstanceType<typeof csl.Relay>;
export type Relays = InstanceType<typeof csl.Relays>;
export type RewardAddress = InstanceType<typeof csl.RewardAddress>;
export type RewardAddresses = InstanceType<typeof csl.RewardAddresses>;
export type ScriptAll = InstanceType<typeof csl.ScriptAll>;
export type ScriptAny = InstanceType<typeof csl.ScriptAny>;
export type ScriptDataHash = InstanceType<typeof csl.ScriptDataHash>;
export type ScriptHash = InstanceType<typeof csl.ScriptHash>;
export type ScriptHashes = InstanceType<typeof csl.ScriptHashes>;
export type ScriptNOfK = InstanceType<typeof csl.ScriptNOfK>;
export type ScriptPubkey = InstanceType<typeof csl.ScriptPubkey>;
export type ScriptRef = InstanceType<typeof csl.ScriptRef>;
export type SingleHostAddr = InstanceType<typeof csl.SingleHostAddr>;
export type SingleHostName = InstanceType<typeof csl.SingleHostName>;
export type StakeCredential = InstanceType<typeof csl.StakeCredential>;
export type StakeCredentials = InstanceType<typeof csl.StakeCredentials>;
export type StakeDelegation = InstanceType<typeof csl.StakeDelegation>;
export type StakeRegistration = InstanceType<typeof csl.StakeRegistration>;
export type Strings = InstanceType<typeof csl.Strings>;
export type TimelockExpiry = InstanceType<typeof csl.TimelockExpiry>;
export type TimelockStart = InstanceType<typeof csl.TimelockStart>;
export type Transaction = InstanceType<typeof csl.Transaction>;
export type TransactionBodies = InstanceType<typeof csl.TransactionBodies>;
export type TransactionBody = InstanceType<typeof csl.TransactionBody>;
export type TransactionBuilder = InstanceType<typeof csl.TransactionBuilder>;
export type TransactionBuilderConfig = InstanceType<
  typeof csl.TransactionBuilderConfig
>;
export type TransactionBuilderConfigBuilder = InstanceType<
  typeof csl.TransactionBuilderConfigBuilder
>;
export type TransactionHash = InstanceType<typeof csl.TransactionHash>;
export type TransactionInput = InstanceType<typeof csl.TransactionInput>;
export type TransactionInputs = InstanceType<typeof csl.TransactionInputs>;
export type TransactionMetadatum = InstanceType<
  typeof csl.TransactionMetadatum
>;
export type TransactionMetadatumLabels = InstanceType<
  typeof csl.TransactionMetadatumLabels
>;
export type TransactionOutput = InstanceType<typeof csl.TransactionOutput>;
export type TransactionOutputAmountBuilder = InstanceType<
  typeof csl.TransactionOutputAmountBuilder
>;
export type TransactionOutputBuilder = InstanceType<
  typeof csl.TransactionOutputBuilder
>;
export type TransactionOutputs = InstanceType<typeof csl.TransactionOutputs>;
export type TransactionUnspentOutput = InstanceType<
  typeof csl.TransactionUnspentOutput
>;
export type TransactionUnspentOutputs = InstanceType<
  typeof csl.TransactionUnspentOutputs
>;
export type TransactionWitnessSet = InstanceType<
  typeof csl.TransactionWitnessSet
>;
export type TransactionWitnessSets = InstanceType<
  typeof csl.TransactionWitnessSets
>;
export type TxBuilderConstants = InstanceType<typeof csl.TxBuilderConstants>;
export type TxInputsBuilder = InstanceType<typeof csl.TxInputsBuilder>;
export type URL = InstanceType<typeof csl.URL>;
export type UnitInterval = InstanceType<typeof csl.UnitInterval>;
export type Update = InstanceType<typeof csl.Update>;
export type VRFCert = InstanceType<typeof csl.VRFCert>;
export type VRFKeyHash = InstanceType<typeof csl.VRFKeyHash>;
export type VRFVKey = InstanceType<typeof csl.VRFVKey>;
export type Value = InstanceType<typeof csl.Value>;
export type Vkey = InstanceType<typeof csl.Vkey>;
export type Vkeys = InstanceType<typeof csl.Vkeys>;
export type Vkeywitness = InstanceType<typeof csl.Vkeywitness>;
export type Vkeywitnesses = InstanceType<typeof csl.Vkeywitnesses>;
export type Withdrawals = InstanceType<typeof csl.Withdrawals>;
