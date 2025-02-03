import { EventEmitter } from "events";
import axios, { AxiosInstance } from "axios";

import {
  AccountInfo,
  Asset,
  AssetMetadata,
  BlockInfo,
  castProtocol,
  GovernanceProposalInfo,
  IFetcher,
  ISubmitter,
  Protocol,
  TransactionInfo,
  UTxO,
} from "@meshsdk/common";

import { parseHttpError } from "./utils";
import { toUTxO } from "./convertor";
import { HydraConnection } from "./hydra-connection";
import { HydraStatus, HydraTransaction, HydraUTxO } from "./types";
import {
  CommandFailed,
  Committed,
  DecommitApproved,
  DecommitFinalized,
  DecommitInvalid,
  DecommitRequested,
  GetUTxOResponse,
  Greetings,
  HeadIsAborted,
  HeadIsClosed,
  HeadIsContested,
  HeadIsFinalized,
  HeadIsInitializing,
  HeadIsOpen,
  IgnoredHeadInitializing,
  InvalidInput,
  PeerConnected,
  PeerDisconnected,
  PeerHandshakeFailure,
  PostTxOnChainFailed,
  ReadyToFanout,
  SnapshotConfirmed,
  TxInvalid,
  TxValid,
} from "./types/events";

/**
 * HydraProvider is a tool for administrating & interacting with Hydra Heads.
 *
 * Usage:
 * ```
 * import { HydraProvider } from "@meshsdk/core";
 *
 * const hydraProvider = new HydraProvider({url:'http://123.45.67.890:4001'});
 */
export class HydraProvider implements IFetcher, ISubmitter {
  private _connection: HydraConnection;
  private _status: HydraStatus = "DISCONNECTED";
  private readonly _eventEmitter: EventEmitter;
  private readonly _axiosInstance: AxiosInstance;

  constructor({
    url,
    history = false,
    address,
  }: {
    url: string;
    history?: boolean;
    address?: string;
  }) {
    this._eventEmitter = new EventEmitter();
    this._connection = new HydraConnection({
      url: url,
      eventEmitter: this._eventEmitter,
      history: history,
      address: address,
    });
    this._axiosInstance = axios.create({ baseURL: url });
  }

  async connect() {
    if (this._status !== "DISCONNECTED") {
      return;
    }
    this._status = "CONNECTING";
    this._connection.connect();
  }

  fetchAccountInfo(address: string): Promise<AccountInfo> {
    throw new Error("Method not implemented.");
  }

  async fetchAddressUTxOs(address: string): Promise<UTxO[]> {
    const utxos = await this.fetchUTxOs();
    return utxos.filter((utxo) => utxo.output.address === address);
  }

  fetchAssetAddresses(
    asset: string,
  ): Promise<{ address: string; quantity: string }[]> {
    throw new Error("Method not implemented.");
  }

  fetchAssetMetadata(asset: string): Promise<AssetMetadata> {
    throw new Error("Method not implemented.");
  }

  fetchBlockInfo(hash: string): Promise<BlockInfo> {
    throw new Error("Method not implemented.");
  }

  fetchCollectionAssets(
    policyId: string,
    cursor?: string | number | undefined,
  ): Promise<{ assets: Asset[]; next: string | number | null }> {
    throw new Error("Method not implemented.");
  }

  async fetchGovernanceProposal(
    txHash: string,
    certIndex: number,
  ): Promise<GovernanceProposalInfo> {
    throw new Error("Method not implemented");
  }

  async fetchProtocolParameters(epoch = Number.NaN): Promise<Protocol> {
    try {
      const { data, status } = await this._axiosInstance.get(
        "protocol-parameters",
      );

      if (status === 200) {
        const protocolParams = castProtocol({
          coinsPerUtxoSize: data.utxoCostPerByte,
          collateralPercent: data.collateralPercentage,
          maxBlockExMem: data.maxBlockExecutionUnits.memory,
          maxBlockExSteps: data.maxBlockExecutionUnits.steps,
          maxBlockHeaderSize: data.maxBlockHeaderSize,
          maxBlockSize: data.maxBlockBodySize,
          maxCollateralInputs: data.maxCollateralInputs,
          maxTxExMem: data.maxTxExecutionUnits.memory,
          maxTxExSteps: data.maxTxExecutionUnits.steps,
          maxTxSize: data.maxTxSize,
          maxValSize: data.maxValueSize,
          minFeeA: data.txFeePerByte,
          minFeeB: data.txFeeFixed,
          minPoolCost: data.minPoolCost,
          poolDeposit: data.stakePoolDeposit,
          priceMem: data.executionUnitPrices.priceMemory,
          priceStep: data.executionUnitPrices.priceSteps,
        });

        return protocolParams;
      }

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  fetchTxInfo(hash: string): Promise<TransactionInfo> {
    throw new Error("Method not implemented.");
  }

  async fetchUTxOs(): Promise<UTxO[]> {
    const { data, status } = await this._axiosInstance.get(`snapshot/utxo`);
    if (status === 200) {
      const utxos: UTxO[] = [];
      for (const [key, value] of Object.entries(data)) {
        const utxo = toUTxO(value as HydraUTxO, key);
        utxos.push(utxo);
      }
      return utxos;
    }
    throw parseHttpError(data);
  }

  /**
   * A generic method to fetch data from a URL.
   * @param url - The URL to fetch data from
   * @returns - The data fetched from the URL
   */
  async get(url: string): Promise<any> {
    try {
      const { data, status } = await this._axiosInstance.get(url);
      if (status === 200 || status == 202) {
        return data;
      }
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * A generic method to post data to a URL.
   * @param url - The URL to post data to
   * @param payload - The data to post
   * @returns - The response from the URL
   */
  async post(url: string, payload: any): Promise<any> {
    try {
      const { data, status } = await this._axiosInstance.post(url, payload);
      if (status === 200 || status == 202) {
        return data;
      }
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Submit a transaction to the Hydra node. Note, unlike other providers, Hydra does not return a transaction hash.
   * @param tx - The transaction in CBOR hex format
   */
  async submitTx(tx: string): Promise<string> {
    try {
      await this.newTx(tx, "Witnessed Tx ConwayEra");
      const txId = await new Promise<string>((resolve) => {
        this.onMessage((message) => {
          if (message.tag === "TxValid") {
            if (message.transaction && message.transaction.cborHex === tx) {
              resolve(message.transaction.txId!);
            }
          }
          if (message.tag === "TxInvalid") {
            if (message.transaction && message.transaction.cborHex === tx) {
              throw JSON.stringify(message.validationError);
            }
          }
        });
      });
      return txId;
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Commands sent to the Hydra node.
   * https://hydra.family/head-protocol/api-reference/#operation-publish-/
   *
   * Accepts one of the following commands:
   * - Init: init()
   * - Abort: abort()
   * - NewTx: newTx()
   * - Decommit: decommit()
   * - Close: close()
   * - Contest: contest()
   * - Fanout: fanout()
   */

  /**
   * Initializes a new Head. This command is a no-op when a Head is already open and the server will output an CommandFailed message should this happen.
   */
  async init() {
    this.send({ tag: "Init" });
  }

  /**
   * Aborts a head before it is opened. This can only be done before all participants have committed. Once opened, the head can't be aborted anymore but it can be closed using: `Close`.
   */
  async abort() {
    this.send({ tag: "Abort" });
  }

  /**
   * Submit a transaction through the head. Note that the transaction is only broadcast if well-formed and valid.
   *
   * @param cborHex The base16-encoding of the CBOR encoding of some binary data
   * @param type Allowed values: "Tx ConwayEra""Unwitnessed Tx ConwayEra""Witnessed Tx ConwayEra"
   * @param description
   */
  async newTx(
    cborHex: string,
    type:
      | "Tx ConwayEra"
      | "Unwitnessed Tx ConwayEra"
      | "Witnessed Tx ConwayEra",
    description = "",
    txId?: string,
  ) {
    const transaction: HydraTransaction = {
      type: type,
      description: description,
      cborHex: cborHex,
      txId: txId,
    };
    const payload = {
      tag: "NewTx",
      transaction: transaction,
    };
    this.send(payload);
  }

  /**
   * Request to decommit a UTxO from a Head by providing a decommit tx. Upon reaching consensus, this will eventually result in corresponding transaction outputs becoming available on the layer 1.
   *
   * @param cborHex The base16-encoding of the CBOR encoding of some binary data
   * @param type Allowed values: "Tx ConwayEra""Unwitnessed Tx ConwayEra""Witnessed Tx ConwayEra"
   * @param description
   */
  async decommit(
    cborHex: string,
    type:
      | "Tx ConwayEra"
      | "Unwitnessed Tx ConwayEra"
      | "Witnessed Tx ConwayEra",
    description: string,
  ) {
    const payload = {
      tag: "Decommit",
      transaction: {
        type: type,
        description: description,
        cborHex: cborHex,
      },
    };
    this.send(payload);
  }

  /**
   * Terminate a head with the latest known snapshot. This effectively moves the head from the Open state to the Close state where the contestation phase begin. As a result of closing a head, no more transactions can be submitted via NewTx.
   */
  async close() {
    this.send({ tag: "Close" });
  }

  /**
   * Challenge the latest snapshot announced as a result of a head closure from another participant. Note that this necessarily contest with the latest snapshot known of your local Hydra node. Participants can only contest once.
   */
  async contest() {
    this.send({ tag: "Contest" });
  }

  /**
   * Finalize a head after the contestation period passed. This will distribute the final (as closed and maybe contested) head state back on the layer 1.
   */
  async fanout() {
    this.send({ tag: "Fanout" });
  }

  send(data: any): void {
    this._connection.send(data);
  }

  // todo: is this function https://hydra.family/head-protocol/api-reference/#operation-publish-/commit the same as the POST?
  // curl -X POST 127.0.0.1:4001/commit \
  // --data @alice-commit-utxo.json \
  // > alice-commit-tx.json
  /**
   * Draft a commit transaction, which can be completed and later submitted to the L1 network.
   * https://hydra.family/head-protocol/api-reference/#operation-publish-/commit
   */
  async commit(){
    await this.post("/commit", {
      // todo --data @alice-commit-utxo.json
    });
    // return alice-commit-tx.json

// If you don't want to commit any funds and only want to receive on layer two, you can request an empty commit transaction as shown below (example for bob):
// curl -X POST 127.0.0.1:4002/commit --data "{}" > bob-commit-tx.json
// cardano-cli transaction submit --tx-file bob-commit-tx.json
  }

  /**
   * Events emitted by the Hydra node.
   * https://hydra.family/head-protocol/api-reference/#operation-subscribe-/
   *
   * @param callback - The callback function to be called when a message is received
   */
  onMessage(
    callback: (
      data:
        | Greetings
        | PeerConnected
        | PeerDisconnected
        | PeerHandshakeFailure
        | HeadIsInitializing
        | Committed
        | HeadIsOpen
        | HeadIsClosed
        | HeadIsContested
        | ReadyToFanout
        | HeadIsAborted
        | HeadIsFinalized
        | TxValid
        | TxInvalid
        | SnapshotConfirmed
        | GetUTxOResponse
        | InvalidInput
        | PostTxOnChainFailed
        | CommandFailed
        | IgnoredHeadInitializing
        | DecommitInvalid
        | DecommitRequested
        | DecommitApproved
        | DecommitFinalized,
    ) => void,
  ) {
    this._eventEmitter.on("onmessage", (message) => {
      switch (message.tag) {
        case "Greetings":
          callback(message as Greetings);
          break;
        case "PeerConnected":
          callback(message as PeerConnected);
          break;
        case "onPeerDisconnected":
          callback(message as PeerDisconnected);
          break;
        case "PeerHandshakeFailure":
          callback(message as PeerHandshakeFailure);
          break;
        case "HeadIsInitializing":
          callback(message as HeadIsInitializing);
          break;
        case "Committed":
          callback(message as Committed);
          break;
        case "HeadIsOpen":
          callback(message as HeadIsOpen);
          break;
        case "HeadIsClosed":
          callback(message as HeadIsClosed);
          break;
        case "HeadIsContested":
          callback(message as HeadIsContested);
          break;
        case "ReadyToFanout":
          callback(message as ReadyToFanout);
          break;
        case "HeadIsAborted":
          callback(message as HeadIsAborted);
          break;
        case "HeadIsFinalized":
          callback(message as HeadIsFinalized);
          break;
        case "TxValid":
          callback(message as TxValid);
          break;
        case "TxInvalid":
          callback(message as TxInvalid);
          break;
        case "SnapshotConfirmed":
          callback(message as SnapshotConfirmed);
          break;
        case "GetUTxOResponse":
          callback(message as GetUTxOResponse);
          break;
        case "InvalidInput":
          callback(message as InvalidInput);
          break;
        case "PostTxOnChainFailed":
          callback(message as PostTxOnChainFailed);
          break;
        case "CommandFailed":
          callback(message as CommandFailed);
          break;
        case "IgnoredHeadInitializing":
          callback(message as IgnoredHeadInitializing);
          break;
        case "DecommitInvalid":
          callback(message as DecommitInvalid);
          break;
        case "DecommitRequested":
          callback(message as DecommitRequested);
          break;
        case "DecommitApproved":
          callback(message as DecommitApproved);
          break;
        case "DecommitFinalized":
          callback(message as DecommitFinalized);
          break;
        default:
          break;
      }
    });
  }

  onStatusChange(callback: (status: HydraStatus) => void) {
    this._eventEmitter.on("onstatuschange", callback);
  }
}
