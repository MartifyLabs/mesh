import axios, { AxiosInstance } from 'axios';
import { SUPPORTED_HANDLES } from '../common/constants.js';
import { IFetcher, IListener, ISubmitter } from '../common/contracts/index.js';
import {
  fromUTF8,
  parseAssetUnit,
  parseHttpError,
  resolveRewardAddress,
  toBytes,
  toScriptRef,
} from '../common/utils/index.js';
import type {
  AccountInfo,
  Asset,
  AssetMetadata,
  BlockInfo,
  NativeScript,
  PlutusScript,
  Protocol,
  TransactionInfo,
  UTxO,
} from '../common/types/index.js';

/**
 * [Blockfrost](https://blockfrost.io/) provides restful APIs which allows your app to access information stored on the blockchain.
 *
 * Get started:
 * ```ts
 * const blockfrostProvider = new BlockfrostProvider('<BLOCKFROST_API_KEY>');
 * ```
 */
export class BlockfrostProvider implements IFetcher, IListener, ISubmitter {
  private readonly _axiosInstance: AxiosInstance;

  /**
   * If you are using a privately hosted Blockfrost instance, you can set the URL in the parameter.
   * @param baseUrl The base URL of the instance.
   */
  constructor(baseUrl: string);

  /**
   * If you are using [Blockfrost](https://blockfrost.io/) hosted instance, you can set the project ID in the parameter.
   * @param projectId The project ID of the instance.
   * @param version The version of the API. Default is 0.
   */
  constructor(projectId: string, version?: number);

  constructor(...args: unknown[]) {
    if (typeof args[0] === 'string' && args[0].startsWith('http')) {
      this._axiosInstance = axios.create({ baseURL: args[0] });
    } else {
      const projectId = args[0] as string;
      const network = projectId.slice(0, 7);
      this._axiosInstance = axios.create({
        baseURL: `https://cardano-${network}.blockfrost.io/api/v${
          args[1] ?? 0
        }`,
        headers: { project_id: projectId },
      });
    }
  }

  async fetchAccountInfo(address: string): Promise<AccountInfo> {
    const rewardAddress = address.startsWith('addr')
      ? resolveRewardAddress(address)
      : address;

    try {
      const { data, status } = await this._axiosInstance.get(
        `accounts/${rewardAddress}`
      );

      if (status === 200)
        return <AccountInfo>{
          poolId: data.pool_id,
          active: data.active || data.active_epoch !== null,
          balance: data.controlled_amount,
          rewards: data.withdrawable_amount,
          withdrawals: data.withdrawals_sum,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  private resolveScriptRef = async (
    scriptHash
  ): Promise<string | undefined> => {
    if (scriptHash) {
      const { data, status } = await this._axiosInstance.get(
        `scripts/${scriptHash}`
      );

      if (status === 200) {
        const script = data.type.startsWith('plutus')
          ? <PlutusScript>{
              code: await this.fetchPlutusScriptCBOR(scriptHash),
              version: data.type.replace('plutus', ''),
            }
          : await this.fetchNativeScriptJSON(scriptHash);

        return toScriptRef(script).to_hex();
      }

      throw parseHttpError(data);
    }

    return undefined;
  };

  private toUTxO = async (
    bfUTxO: BlockfrostUTxO,
    tx_hash: string
  ): Promise<UTxO> => ({
    input: {
      outputIndex: bfUTxO.output_index,
      txHash: tx_hash,
    },
    output: {
      address: bfUTxO.address,
      amount: bfUTxO.amount,
      dataHash: bfUTxO.data_hash ?? undefined,
      plutusData: bfUTxO.inline_datum ?? undefined,
      scriptRef: await this.resolveScriptRef(bfUTxO.reference_script_hash),
      scriptHash: bfUTxO.reference_script_hash,
    },
  });

  async fetchAddressUTxOs(address: string, asset?: string): Promise<UTxO[]> {
    const filter = asset !== undefined ? `/${asset}` : '';
    const url = `addresses/${address}/utxos` + filter;

    const paginateUTxOs = async (
      page = 1,
      utxos: UTxO[] = []
    ): Promise<UTxO[]> => {
      const { data, status } = await this._axiosInstance.get(
        `${url}?page=${page}`
      );

      if (status === 200)
        return data.length > 0
          ? paginateUTxOs(page + 1, [
              ...utxos,
              ...(await Promise.all(
                data.map((utxo) => this.toUTxO(utxo, utxo.tx_hash))
              )),
            ])
          : utxos;

      throw parseHttpError(data);
    };

    try {
      return await paginateUTxOs();
    } catch (error) {
      return [];
    }
  }

  async fetchAssetAddresses(
    asset: string
  ): Promise<{ address: string; quantity: string }[]> {
    const paginateAddresses = async <T>(
      page = 1,
      addresses: T[] = []
    ): Promise<T[]> => {
      const { policyId, assetName } = parseAssetUnit(asset);
      const { data, status } = await this._axiosInstance.get(
        `assets/${policyId}${assetName}/addresses?page=${page}`
      );

      if (status === 200)
        return data.length > 0
          ? paginateAddresses(page + 1, [...addresses, ...data])
          : addresses;

      throw parseHttpError(data);
    };

    try {
      return await paginateAddresses<{ address: string; quantity: string }>();
    } catch (error) {
      return [];
    }
  }

  async fetchAssetMetadata(asset: string): Promise<AssetMetadata> {
    try {
      const { policyId, assetName } = parseAssetUnit(asset);
      const { data, status } = await this._axiosInstance.get(
        `assets/${policyId}${assetName}`
      );

      if (status === 200)
        return <AssetMetadata>{
          ...data.onchain_metadata,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchBlockInfo(hash: string): Promise<BlockInfo> {
    try {
      const { data, status } = await this._axiosInstance.get(`blocks/${hash}`);

      if (status === 200)
        return <BlockInfo>{
          confirmations: data.confirmations,
          epoch: data.epoch,
          epochSlot: data.epoch_slot.toString(),
          fees: data.fees,
          hash: data.hash,
          nextBlock: data.next_block ?? '',
          operationalCertificate: data.op_cert,
          output: data.output ?? '0',
          previousBlock: data.previous_block,
          size: data.size,
          slot: data.slot.toString(),
          slotLeader: data.slot_leader ?? '',
          time: data.time,
          txCount: data.tx_count,
          VRFKey: data.block_vrf,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchCollectionAssets(
    policyId: string,
    cursor = 1
  ): Promise<{ assets: Asset[]; next: string | number | null }> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `assets/policy/${policyId}?page=${cursor}`
      );

      if (status === 200)
        return {
          assets: data.map((asset) => ({
            unit: asset.asset,
            quantity: asset.quantity,
          })),
          next: data.length === 100 ? cursor + 1 : null,
        };

      throw parseHttpError(data);
    } catch (error) {
      return { assets: [], next: null };
    }
  }

  async fetchHandleAddress(handle: string): Promise<string> {
    try {
      const assetName = fromUTF8(handle.replace('$', ''));
      const { data, status } = await this._axiosInstance.get(
        `assets/${SUPPORTED_HANDLES[1]}${assetName}/addresses`
      );

      if (status === 200) return data[0].address;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchProtocolParameters(epoch = Number.NaN): Promise<Protocol> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `epochs/${isNaN(epoch) ? 'latest' : epoch}/parameters`
      );

      if (status === 200)
        return <Protocol>{
          coinsPerUTxOSize: data.coins_per_utxo_word,
          collateralPercent: data.collateral_percent,
          decentralisation: data.decentralisation_param,
          epoch: data.epoch,
          keyDeposit: data.key_deposit,
          maxBlockExMem: data.max_block_ex_mem,
          maxBlockExSteps: data.max_block_ex_steps,
          maxBlockHeaderSize: data.max_block_header_size,
          maxBlockSize: data.max_block_size,
          maxCollateralInputs: data.max_collateral_inputs,
          maxTxExMem: data.max_tx_ex_mem,
          maxTxExSteps: data.max_tx_ex_steps,
          maxTxSize: data.max_tx_size,
          maxValSize: data.max_val_size,
          minFeeA: data.min_fee_a,
          minFeeB: data.min_fee_b,
          minPoolCost: data.min_pool_cost,
          poolDeposit: data.pool_deposit,
          priceMem: data.price_mem,
          priceStep: data.price_step,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchTxInfo(hash: string): Promise<TransactionInfo> {
    try {
      const { data, status } = await this._axiosInstance.get(`txs/${hash}`);

      if (status === 200)
        return <TransactionInfo>{
          block: data.block,
          deposit: data.deposit,
          fees: data.fees,
          hash: data.hash,
          index: data.index,
          invalidAfter: data.invalid_hereafter ?? '',
          invalidBefore: data.invalid_before ?? '',
          slot: data.slot.toString(),
          size: data.size,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchUTxOs(hash: string): Promise<UTxO[]> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `txs/${hash}/utxos`
      );
      if (status === 200) {
        const bfOutputs = data.outputs as BlockfrostUTxO[];
        const outputsPromises: Promise<UTxO>[] = [];
        bfOutputs.forEach((output) => {
          outputsPromises.push(this.toUTxO(output, hash));
        });
        const outputs = await Promise.all(outputsPromises);
        return outputs;
      }
      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  onTxConfirmed(txHash: string, callback: () => void, limit = 100): void {
    let attempts = 0;

    const checkTx = setInterval(() => {
      if (attempts >= limit) clearInterval(checkTx);

      this.fetchTxInfo(txHash)
        .then((txInfo) => {
          this.fetchBlockInfo(txInfo.block)
            .then((blockInfo) => {
              if (blockInfo?.confirmations > 0) {
                clearInterval(checkTx);
                callback();
              }
            })
            .catch(() => {
              attempts += 1;
            });
        })
        .catch(() => {
          attempts += 1;
        });
    }, 5_000);
  }

  async submitTx(tx: string): Promise<string> {
    try {
      const headers = { 'Content-Type': 'application/cbor' };
      const { data, status } = await this._axiosInstance.post(
        'tx/submit',
        toBytes(tx),
        { headers }
      );

      if (status === 200) return data;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  private async fetchPlutusScriptCBOR(scriptHash: string): Promise<string> {
    const { data, status } = await this._axiosInstance.get(
      `scripts/${scriptHash}/cbor`
    );

    if (status === 200) return data.cbor;

    throw parseHttpError(data);
  }

  private async fetchNativeScriptJSON(
    scriptHash: string
  ): Promise<NativeScript> {
    const { data, status } = await this._axiosInstance.get(
      `scripts/${scriptHash}/json`
    );

    if (status === 200) return data.json;

    throw parseHttpError(data);
  }
}

type BlockfrostUTxO = {
  output_index: number;
  amount: Array<Asset>;
  address: string;
  data_hash?: string;
  inline_datum?: string;
  collateral?: boolean;
  reference_script_hash?: string;
};
