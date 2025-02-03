import { HydraProvider } from "./hydra-provider";

/**
 * todo: implement https://hydra.family/head-protocol/docs/tutorial/
 */
export class HydraInstance {
  provider: HydraProvider;

  constructor({ provider }: { provider: HydraProvider }) {
    this.provider = provider;
  }

  /**
   * To commit funds to the head, choose which UTxO you would like to make available on layer 2.
   */
  async commitFunds() {
    // cardano-cli query utxo \
    //   --address $(cat credentials/bob-funds.addr) \
    //   --out-file bob-commit-utxo.json
    // curl -X POST 127.0.0.1:4002/commit \
    //   --data @bob-commit-utxo.json \
    //   > bob-commit-tx.json
    // cardano-cli transaction sign \
    //   --tx-file bob-commit-tx.json \
    //   --signing-key-file credentials/bob-funds.sk \
    //   --out-file bob-commit-tx-signed.json
    // cardano-cli transaction submit --tx-file bob-commit-tx-signed.json
  }

  /**
   * https://hydra.family/head-protocol/docs/how-to/commit-blueprint/
   *
   * If you don't want to commit any funds and only want to receive on layer two, you can request an empty commit transaction.:
   * @returns
   */
  async commitBlueprint() {
    return "txHash";
  }

  /**
   * https://hydra.family/head-protocol/unstable/docs/how-to/incremental-commit
   *
   * If you don't want to commit any funds and only want to receive on layer two, you can request an empty commit transaction.:
   * @returns
   */
  async incrementalCommit() {
    return "txHash";
  }

  /**
   * https://hydra.family/head-protocol/docs/how-to/incremental-decommit
   *
   * @returns
   */
  async incrementalDecommit() {
    return "txHash";
  }
}
