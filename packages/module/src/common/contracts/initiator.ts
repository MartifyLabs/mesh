import type { Address, TransactionUnspentOutput } from '../../core/index.js';

export interface IInitiator {
  getUsedAddress(): SometimesPromise<Address>;
  getUsedCollateral(
    limit?: number
  ): SometimesPromise<TransactionUnspentOutput[]>;
  getUsedUTxOs(): SometimesPromise<TransactionUnspentOutput[]>;
}

type SometimesPromise<T> = Promise<T> | T;
