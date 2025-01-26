import { Asset } from "./asset";
import {TxOutput} from "./tx-output";

export type UTxO = {
  input: {
    outputIndex: number;
    txHash: string;
  };
  output: TxOutput
};
