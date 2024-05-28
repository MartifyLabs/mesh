import {
  Asset,
  Budget,
  Data,
  LanguageVersion,
  PlutusScript,
  UTxO,
  PoolParams,
} from '../../common/types/index.js';

export type MeshTxBuilderBody = {
  inputs: TxIn[];
  outputs: Output[];
  extraInputs: UTxO[];
  selectionThreshold: number;
  collaterals: PubKeyTxIn[];
  requiredSignatures: string[];
  referenceInputs: RefTxIn[];
  mints: MintItem[];
  changeAddress: string;
  metadata: Metadata[];
  validityRange: ValidityRange;
  certificates: Certificate[];
  // withdrawals?: Record<StakeCredential, number>;
  signingKey: string[];
};

export type TxIn = PubKeyTxIn | ScriptTxIn;

export type PubKeyTxIn = { type: 'PubKey'; txIn: TxInParameter };

export type TxInParameter = {
  txHash: string;
  txIndex: number;
  amount?: Asset[];
  address?: string;
};

export type ScriptTxIn = {
  type: 'Script';
  txIn: TxInParameter;
  scriptTxIn: ScriptTxInParameter;
};

export type ScriptTxInParameter = {
  scriptSource?:
    | {
        type: 'Provided';
        script: PlutusScript;
      }
    | {
        type: 'Inline';
        txInInfo: ScriptSourceInfo;
      };
  datumSource?:
    | {
        type: 'Provided';
        data: BuilderData;
      }
    | {
        type: 'Inline';
        txHash: string;
        txIndex: number;
      };
  redeemer?: Redeemer;
};

export type ScriptSourceInfo = {
  txHash: string;
  txIndex: number;
  spendingScriptHash?: string;
  version: LanguageVersion;
};

export type RefTxIn = { txHash: string; txIndex: number };

export type Output = {
  address: string;
  amount: Asset[];
  datum?: {
    type: 'Hash' | 'Inline';
    data: BuilderData;
  };
  referenceScript?: PlutusScript;
};

export type MintItem = {
  type: 'Plutus' | 'Native';
  policyId: string;
  assetName: string;
  amount: string;
  redeemer?: Redeemer;
  scriptSource?:
    | {
        type: 'Provided';
        script: PlutusScript;
      }
    | {
        type: 'Reference Script';
        txHash: string;
        txIndex: number;
        version: LanguageVersion;
      };
};

// export type Certificate = {};
// export type StakeCredential = {};
export type ValidityRange = {
  invalidBefore?: number;
  invalidHereafter?: number;
};

export type BuilderData =
  | {
      type: 'Mesh';
      content: Data;
    }
  | {
      type: 'JSON';
      content: string;
    }
  | {
      type: 'CBOR';
      content: string;
    };

// Mint Types

export type Redeemer = {
  data: BuilderData;
  exUnits: Budget;
};

export type Metadata = {
  tag: string;
  metadata: object;
};

export type Certificate =
  | { type: 'RegisterPool'; poolParams: PoolParams }
  | { type: 'RegisterStake'; stakeKeyHash: string }
  | { type: 'DelegateStake'; stakeKeyHash: string; poolId: string }
  | { type: 'DeregisterStake'; stakeKeyHash: string }
  | { type: 'RetirePool'; poolId: string; epoch: number };

// Utilities

export type RequiredWith<T, K extends keyof T> = Required<T> & {
  [P in K]: Required<T[P]>;
};
