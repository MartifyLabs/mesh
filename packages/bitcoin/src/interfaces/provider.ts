import { UTxO } from "../types";
import { AddressInfo } from "../types/address-info";
import { ScriptInfo } from "../types/script-info";
import { TransactionsInfo } from "../types/transactions-info";
import { TransactionsStatus } from "../types/transactions-status";

export interface IBitcoinProvider {
  fetchAddress(address: string): Promise<AddressInfo>;
  fetchAddressTransactions(
    address: string,
    last_seen_txid?: string
  ): Promise<TransactionsInfo[]>;
  fetchAddressUTxOs(address: string): Promise<UTxO[]>;
  fetchScript(hash: string): Promise<ScriptInfo>;
  fetchScriptTransactions(
    hash: string,
    last_seen_txid?: string
  ): Promise<TransactionsInfo[]>;
  fetchScriptUTxOs(hash: string): Promise<UTxO[]>;
  fetchTransactionStatus(txid: string): Promise<TransactionsStatus>;
  submitTx(tx: string): Promise<string>;
}
