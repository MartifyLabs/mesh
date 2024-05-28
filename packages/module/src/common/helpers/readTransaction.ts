import { csl } from '../../core/index.js';
import { deserializeTx } from '../../common/utils/index.js';

export const readTransaction = (tx: string): csl.TransactionJSON => {
  return deserializeTx(tx).to_js_value();
};
