import { ChainStats } from "./chain-stats";
import { MempoolStats } from "./mempool-stats";

export type AddressInfo = {
  address: string;
  chain_stats: ChainStats;
  mempool_stats: MempoolStats;
};
