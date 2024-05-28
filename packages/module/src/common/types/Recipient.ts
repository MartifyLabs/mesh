import { Data } from './Data.js';
import { NativeScript } from './NativeScript.js';
import { PlutusScript } from './PlutusScript.js';

export type Recipient =
  | string
  | {
      address: string;
      datum?: {
        value: Data;
        inline?: boolean;
      };
      script?: PlutusScript | NativeScript;
    };
