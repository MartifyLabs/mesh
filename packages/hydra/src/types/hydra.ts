import { HYDRA_STATUS } from "../constants";

export type HydraAssets = {
  lovelace: number;
} & {
  [x: string]:
    | {
        [y: string]: number;
      }
    | undefined;
};

export type HydraCommitTransaction = {
  cborHex: string;
  description: string;
  txId: string;
  type: string;
};

export interface HydraHeadParameters {
  contestationPeriod: number;
  parties: HydraParty[];
}

export type HydraParty = {
  vkey: string;
};

export type HydraReferenceScript = {
  scriptLanguage: string;
  script: {
    cborHex: string;
    description: string;
    type:
      | "SimpleScript"
      | "PlutusScriptV1"
      | "PlutusScriptV2"
      | "PlutusScriptV3";
  };
};

export type HydraStatus = (typeof HYDRA_STATUS)[keyof typeof HYDRA_STATUS];

export type HydraSnapshot = {
  headId: string;
  snapshotNumber: string;
  utxo: HydraUTxOs;
  confirmedTransactions: string[];
  utxoToDecommit: HydraUTxOs;
  version: number;
};

export type HydraTransaction = {
  type: "Tx ConwayEra" | "Unwitnessed Tx ConwayEra" | "Witnessed Tx ConwayEra";
  description: string;
  cborHex: string;
  txId?: string;
};

export type HydraUTxOs = {
  [txRef: string]: HydraUTxO;
};

export type HydraUTxO = {
  address: string;
  value: HydraAssets;
  referenceScript?: HydraReferenceScript;
  datumhash?: string;
  inlineDatum?: object;
  inlineDatumhash?: string;
  datum?: string;
};
