import {
  BuilderData,
  Data,
  DeserializedAddress,
  DeserializedScript,
  MeshTxBuilderBody,
  NativeScript,
  PlutusScript,
  Protocol,
  TxOutput,
} from "../types";

export interface IMeshTxSerializer {
  verbose: boolean;
  serializeTxBody(
    txBuilderBody: MeshTxBuilderBody,
    protocolParams: Protocol,
  ): string;
  serializeTxBodyWithMockSignatures(
      txBuilderBody: MeshTxBuilderBody,
      protocolParams: Protocol,
  ): string;
  addSigningKeys(txHex: string, signingKeys: string[]): string;
  resolver: IResolver;
  deserializer: IDeserializer;
  serializeData(data: BuilderData): string;
  serializeAddress(address: DeserializedAddress, networkId?: 0 | 1): string;
  serializePoolId(hash: string): string;
  serializeRewardAddress(
    stakeKeyHash: string,
    isScriptHash?: boolean,
    network_id?: 0 | 1,
  ): string;
  serializeOutput(output: TxOutput): string;
}
export interface IResolver {
  keys: {
    resolvePrivateKey(words: string[]): string;
    resolveRewardAddress(bech32: string): string;
    resolveEd25519KeyHash(bech32: string): string;
    resolveStakeKeyHash(bech32: string): string;
  };
  tx: {
    resolveTxHash(txHex: string): string;
  };
  data: {
    resolveDataHash(data: Data): string;
  };
  script: {
    resolveScriptRef(script: NativeScript | PlutusScript): string;
  };
}

export interface IDeserializer {
  key: {
    deserializeAddress(bech32: string): DeserializedAddress;
  };
  script: {
    deserializeNativeScript(script: NativeScript): DeserializedScript;
    deserializePlutusScript(script: PlutusScript): DeserializedScript;
  };
  cert: {
    deserializePoolId(poolId: string): string;
  };
}
