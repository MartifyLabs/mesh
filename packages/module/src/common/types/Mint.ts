import { Quantity } from './Asset.js';
import { AssetMetadata } from './AssetMetadata.js';
import { Recipient } from './Recipient.js';

export type Mint = {
  assetName: string;
  assetQuantity: Quantity;
  metadata: AssetMetadata;
  recipient: Recipient;
  label: '20' | '721' | '777' | `${number}`;
};
