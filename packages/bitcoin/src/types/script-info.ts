import { ChainStats } from "./chain-stats";
import { MempoolStats } from "./mempool-stats";

export type ScriptInfo = {
  scripthash: string;
  chain_stats: ChainStats;
  mempool_stats: MempoolStats;
};
