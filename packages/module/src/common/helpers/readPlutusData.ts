import {
  deserializePlutusData,
  fromPlutusData,
} from '../../common/utils/index.js';
import type { Data } from '../../common/types/index.js';

export const readPlutusData = (plutusData: string): Data => {
  return fromPlutusData(deserializePlutusData(plutusData));
};
