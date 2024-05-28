import { Action } from '../../common/types/index.js';

export interface IEvaluator {
  evaluateTx(tx: string): Promise<Omit<Action, 'data'>[]>;
}
