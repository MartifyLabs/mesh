import { REDEEMER_TAGS } from '../../common/constants.js';
import { Data } from './Data.js';

export type Action = {
  data: Data;
  index: number;
  budget: Budget;
  tag: keyof typeof REDEEMER_TAGS;
};

export type Budget = {
  mem: number;
  steps: number;
};
