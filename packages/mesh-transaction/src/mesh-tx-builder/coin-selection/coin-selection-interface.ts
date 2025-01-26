import {Cardano} from "@cardano-sdk/core";
import {Asset, TxOutput, UTxO} from "@meshsdk/common";

export interface TransactionPrototype {
    inputs: Set<UTxO>;
    outputs: Set<TxOutput>;
    change: Array<TxOutput>;
    fee: bigint;
}

export interface SelectionResult {
    selection: TransactionPrototype;
    remainingUTxO: Set<UTxO>;
}

export declare type EstimateTxCosts = (selectionSkeleton: TransactionPrototype) => Promise<bigint>;
export declare type TokenBundleSizeExceedsLimit = (tokenBundle?: Asset[]) => boolean;
export declare type ComputeMinimumCoinQuantity = (output: TxOutput) => bigint;
export declare type ComputeSelectionLimit = (selectionSkeleton: TransactionPrototype) => Promise<number>;

export interface BuilderCallbacks {
    computeMinimumCost: EstimateTxCosts;
    tokenBundleSizeExceedsLimit: TokenBundleSizeExceedsLimit;
    computeMinimumCoinQuantity: ComputeMinimumCoinQuantity;
    computeSelectionLimit: ComputeSelectionLimit;
}

export interface IInputSelector {
    select: (utxo: Set<UTxO>, constraints: BuilderCallbacks) => Promise<SelectionResult>;
}
