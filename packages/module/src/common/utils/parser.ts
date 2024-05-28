import axios from 'axios';
import { fromUTF8 } from './converter.js';
import { POLICY_ID_LENGTH } from '../constants.js';

export const parseAssetUnit = (unit: string) => {
  const policyId = unit.slice(0, POLICY_ID_LENGTH);
  const assetName = unit.includes('.')
    ? fromUTF8(unit.split('.')[1])
    : unit.slice(POLICY_ID_LENGTH);

  return { policyId, assetName };
};

export const parseHttpError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return JSON.stringify({
        data: error.response.data,
        headers: error.response.headers,
        status: error.response.status,
      });
    } else if (error.request) {
      return JSON.stringify(error.request);
    } else {
      return error.message;
    }
  } else {
    return JSON.stringify(error);
  }
};
