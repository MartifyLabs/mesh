import { Relay } from './Relay.js';

export type PoolParams = {
  VRFKeyHash: string;
  operator: string;
  pledge: string;
  cost: string;
  margin: number;
  relays: Relay[];
  owners: string[];
  rewardAddress: string;
  metadata?: PoolMetadata;
};

export type PoolMetadata = {
  URL: string;
  hash: string;
};
