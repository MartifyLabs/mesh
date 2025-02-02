import axios, { AxiosInstance } from "axios";
import { IBitcoinProvider } from "../interfaces/provider";
import { UTxO } from "../types";
import { parseHttpError } from "./common";
import { AddressInfo } from "../types/address-info";
import { ScriptInfo } from "../types/script-info";
import { TransactionsInfo } from "../types/transactions-info";
import { TransactionsStatus } from "../types/transactions-status";

/**
 * https://github.com/Blockstream/esplora/blob/master/API.md
 */
export class BlockstreamProvider implements IBitcoinProvider {
  private readonly _axiosInstance: AxiosInstance;

  constructor(network: "mainnet" | "testnet" = "mainnet") {
    const baseURL =
      network === "testnet"
        ? "https://blockstream.info/testnet/api"
        : "https://blockstream.info/api";

    this._axiosInstance = axios.create({
      baseURL,
    });
  }

  /**
   * Get information about an address.
   * @param address - The address.
   * @returns AddressInfo
   */
  async fetchAddress(address: string): Promise<AddressInfo> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `/address/${address}`
      );

      if (status === 200) return data as AddressInfo;
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Get transaction history for the specified address, sorted with newest first.
   * Returns up to 50 mempool transactions plus the first 25 confirmed transactions. You can request more confirmed transactions using `last_seen_txid`.
   * @param address - The address.
   * @param last_seen_txid - The last seen transaction ID (optional).
   * @returns TransactionsInfo[]
   */
  async fetchAddressTransactions(
    address: string,
    last_seen_txid?: string
  ): Promise<TransactionsInfo[]> {
    try {
      const url = last_seen_txid
        ? `/address/${address}/txs/chain/${last_seen_txid}`
        : `/address/${address}/txs`;
      const { data, status } = await this._axiosInstance.get(url);

      if (status === 200) return data as TransactionsInfo[];
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Get the list of unspent transaction outputs associated with the address.
   * @param address - The address.
   * @returns UTxO[]
   */
  async fetchAddressUTxOs(address: string): Promise<UTxO[]> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `/address/${address}/utxo`
      );

      if (status === 200) return data as UTxO[];
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Get information about a scripthash.
   * @param hash - The hash of the script.
   * @returns ScriptInfo
   */
  async fetchScript(hash: string): Promise<ScriptInfo> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `/scripthash/${hash}`
      );

      if (status === 200) return data as ScriptInfo;
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Get transaction history for the specified scripthash, sorted with newest first.
   * Returns up to 50 mempool transactions plus the first 25 confirmed transactions. You can request more confirmed transactions using `last_seen_txid`.
   * @param hash - The hash of the script.
   * @param last_seen_txid - The last seen transaction ID (optional).
   * @returns TransactionsInfo[]
   */
  async fetchScriptTransactions(
    hash: string,
    last_seen_txid?: string
  ): Promise<TransactionsInfo[]> {
    try {
      const url = last_seen_txid
        ? `/scripthash/${hash}/txs/chain/${last_seen_txid}`
        : `/scripthash/${hash}/txs`;
      const { data, status } = await this._axiosInstance.get(url);

      if (status === 200) return data as TransactionsInfo[];
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Get the list of unspent transaction outputs associated with the scripthash.
   * @param hash - The hash of the script.
   * @returns UTxO[]
   */
  async fetchScriptUTxOs(hash: string): Promise<UTxO[]> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `/scripthash/${hash}/utxo`
      );

      if (status === 200) return data as UTxO[];
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Fetches the status of a transaction
   * @param txid - The transaction ID.
   * @returns TransactionsStatus
   */
  async fetchTransactionStatus(txid: string): Promise<TransactionsStatus> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `/tx/${txid}/status`
      );

      if (status === 200) return data as TransactionsStatus;
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  /**
   * Broadcast a raw transaction to the network.
   * The transaction should be provided as hex in the request body. The txid will be returned on success.
   * @param tx - The transaction in hex format.
   * @returns The transaction ID.
   */
  async submitTx(tx: string): Promise<string> {
    try {
      const { data, status } = await this._axiosInstance.post("/tx", tx, {
        headers: { "Content-Type": "text/plain" },
      });

      if (status === 200) return data as string;
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }
}
