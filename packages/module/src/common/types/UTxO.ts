import { Asset } from './Asset.js';

export type UTxO = {
  input: {
    outputIndex: number;
    txHash: string;
  };
  output: {
    address: string;
    amount: Asset[];
    dataHash?: string;
    plutusData?: string;
    scriptRef?: string;
    scriptHash?: string;
  };
};
