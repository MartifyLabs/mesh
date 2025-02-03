import {
  HydraParty,
  HydraSnapshot,
  HydraTransaction,
  HydraUTxOs,
} from "../types";
import { PostChainTx } from "./hydra-post-chain-tx";

export type Greetings = {
  tag: "Greetings";
  me: {
    vkey: string;
  };
  headStatus:
    | "Idle"
    | "Initializing"
    | "Open"
    | "Closed"
    | "FanoutPossible"
    | "Final";
  hydraHeadId: string;
  snapshotUtxo: HydraUTxOs;
  timestamp: string;
  hydraNodeVersion: string;
};

export type PeerConnected = {
  tag: "PeerConnected";
  peer: string;
  seq: number;
  timestamp: string;
};

export type PeerDisconnected = {
  tag: "PeerDisconnected";
  peer: string;
  seq: number;
  timestamp: string;
};

export type PeerHandshakeFailure = {
  tag: "PeerHandshakeFailure";
  remoteHost:
    | {
        tag: "IPv4";
        ipv4: string;
      }
    | {
        tag: "IPv6";
        ipv6: string;
      };
  ourVersion: number;
  theirVersions: number[];
  seq: number;
  timestamp: string;
};

export type HeadIsInitializing = {
  tag: "HeadIsInitializing";
  headId: string;
  parties: HydraParty[];
  seq: number;
  timestamp: string;
};

export type Committed = {
  tag: "Committed";
  parties: HydraParty[];
  utxo: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type HeadIsOpen = {
  tag: "HeadIsOpen";
  headId: string;
  utxo: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type HeadIsClosed = {
  tag: "HeadIsClosed";
  headId: string;
  snapshotNumber: number;
  contestationDeadline: string;
  seq: number;
  timestamp: string;
};

export type HeadIsContested = {
  tag: "HeadIsContested";
  headId: string;
  snapshotNumber: number;
  contestationDeadline: string;
  seq: number;
  timestamp: string;
};

export type ReadyToFanout = {
  tag: "ReadyToFanout";
  headId: string;
  seq: number;
  timestamp: string;
};

export type HeadIsAborted = {
  tag: "HeadIsAborted";
  headId: string;
  utxo: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type HeadIsFinalized = {
  tag: "HeadIsFinalized";
  headId: string;
  utxo: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type TxValid = {
  tag: "TxValid";
  headId: string;
  transaction: HydraTransaction;
  seq: number;
  timestamp: string;
};

export type TxInvalid = {
  tag: "TxInvalid";
  headId: string;
  utxo: HydraUTxOs;
  transaction: HydraTransaction;
  validationError: { reason: string };
  seq: number;
  timestamp: string;
};

export type SnapshotConfirmed = {
  tag: "SnapshotConfirmed";
  headId: string;
  snapshot: HydraSnapshot;
  seq: number;
  timestamp: string;
};

export type GetUTxOResponse = {
  tag: "GetUTxOResponse";
  headId: string;
  utxo: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type InvalidInput = {
  tag: "InvalidInput";
  reason: string;
  input: string;
  seq: number;
  timestamp: string;
};

export type PostTxOnChainFailed = {
  tag: "PostTxOnChainFailed";
  postChainTx: PostChainTx;
  postTxError: any;
  seq: number;
  timestamp: string;
};

export type CommandFailed = {
  tag: "CommandFailed";
  clientInput:
    | {
        tag: "Abort";
      }
    | { tag: "NewTx"; transaction: HydraTransaction }
    | { tag: "GetUTxO" }
    | { tag: "Decommit"; decommitTx: HydraTransaction }
    | { tag: "Close" }
    | { tag: "Contest" }
    | { tag: "Fanout" };
  seq: number;
  timestamp: string;
};

export type IgnoredHeadInitializing = {
  tag: "IgnoredHeadInitializing";
  headId: string;
  contestationPeriod: number;
  parties: HydraParty[];
  participants: string[];
  seq: number;
  timestamp: string;
};

export type DecommitInvalid = {
  tag: "DecommitInvalid";
  headId: string;
  decommitTx: HydraTransaction;
  decommitInvalidReason:
    | {
        tag: "DecommitTxInvalid";
        localUtxo: HydraUTxOs;
        validationError: { reason: string };
      }
    | { tag: "DecommitAlreadyInFlight"; otherDecommitTxId: string };
};

export type DecommitRequested = {
  tag: "DecommitRequested";
  headId: string;
  decommitTx: HydraTransaction;
  utxoToDecommit: HydraUTxOs;
  seq: number;
  timestmap: string;
};

export type DecommitApproved = {
  tag: "DecommitApproved";
  headId: string;
  decommitTxId: string;
  utxoToDecommit: HydraUTxOs;
  seq: number;
  timestamp: string;
};

export type DecommitFinalized = {
  tag: "DecommitFinalized";
  headId: string;
  decommitTxId: string;
  seq: number;
  timestamp: string;
};
