import { Quantity, Unit } from './Asset.js';

export type AssetExtended = {
  unit: Unit;
  policyId: string;
  assetName: string;
  fingerprint: string;
  quantity: Quantity;
};
