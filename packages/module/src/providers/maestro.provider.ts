import axios, { AxiosInstance } from 'axios';
import { IEvaluator, IFetcher, ISubmitter } from '../common/contracts/index.js';
import {
  parseAssetUnit,
  parseHttpError,
  resolveRewardAddress,
  toBytes,
  toScriptRef,
} from '../common/utils/index.js';
import type {
  AccountInfo,
  Action,
  Asset,
  AssetMetadata,
  BlockInfo,
  NativeScript,
  PlutusScript,
  Protocol,
  TransactionInfo,
  UTxO,
} from '../common/types/index.js';
import { csl } from '../core/index.js';

export type MaestroSupportedNetworks = 'Mainnet' | 'Preprod' | 'Preview';

export interface MaestroConfig {
  network: MaestroSupportedNetworks;
  apiKey: string;
  turboSubmit?: boolean; // Read about paid turbo transaction submission feature at https://docs-v1.gomaestro.org/docs/Dapp%20Platform/Turbo%20Transaction.
}

export class MaestroProvider implements IFetcher, ISubmitter, IEvaluator {
  private readonly _axiosInstance: AxiosInstance;
  private readonly _amountsAsStrings = {
    headers: {
      'amounts-as-strings': 'true',
    },
  };

  submitUrl: string;

  constructor({ network, apiKey, turboSubmit = false }: MaestroConfig) {
    this._axiosInstance = axios.create({
      baseURL: `https://${network}.gomaestro-api.org/v1`,
      headers: { 'api-key': apiKey },
    });
    this.submitUrl = turboSubmit ? 'txmanager/turbosubmit' : 'txmanager';
  }

  async evaluateTx(cbor: string): Promise<Omit<Action, 'data'>[]> {
    try {
      const { data, status } = await this._axiosInstance.post(
        'transactions/evaluate',
        { cbor }
      );
      if (status === 200) {
        const tagMap = {
          spend: 'SPEND',
          mint: 'MINT',
          cert: 'CERT',
          wdrl: 'REWARD',
        };
        const result = data.map((action) => {
          const budget = action.ex_units;
          const index = action.redeemer_index;
          const tag = tagMap[action.redeemer_tag];
          return { budget, index, tag };
        });
        return result;
      }

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchAccountInfo(address: string): Promise<AccountInfo> {
    const rewardAddress = address.startsWith('addr')
      ? resolveRewardAddress(address)
      : address;

    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `accounts/${rewardAddress}`,
        this._amountsAsStrings
      );

      if (status === 200) {
        const data = timestampedData.data;
        return <AccountInfo>{
          poolId: data.delegated_pool,
          active: data.registered,
          balance: data.total_balance,
          rewards: data.rewards_available,
          withdrawals: data.total_withdrawn,
        };
      }

      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchAddressUTxOs(address: string, asset?: string): Promise<UTxO[]> {
    const queryPredicate = (() => {
      if (
        address.startsWith('addr_vkh') ||
        address.startsWith('addr_shared_vkh')
      )
        return `addresses/cred/${address}`;
      else return `addresses/${address}`;
    })();
    const appendAssetString = asset ? `&asset=${asset}` : '';
    const paginateUTxOs = async (
      cursor = null,
      utxos: UTxO[] = []
    ): Promise<UTxO[]> => {
      const appendCursorString = cursor === null ? '' : `&cursor=${cursor}`;
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `${queryPredicate}/utxos?count=100${appendAssetString}${appendCursorString}`,
        this._amountsAsStrings
      );
      if (status === 200) {
        const data = timestampedData.data;
        const pageUTxOs: UTxO[] = data.map(this.toUTxO);
        const addedUtxos = [...utxos, ...pageUTxOs];
        const nextCursor = timestampedData.next_cursor;
        return nextCursor == null
          ? addedUtxos
          : paginateUTxOs(nextCursor, addedUtxos);
      }

      throw parseHttpError(timestampedData);
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
    const { policyId, assetName } = parseAssetUnit(asset);
    const paginateAddresses = async (
      cursor = null,
      addressesWithQuantity: { address: string; quantity: string }[] = []
    ): Promise<{ address: string; quantity: string }[]> => {
      const appendCursorString = cursor === null ? '' : `&cursor=${cursor}`;
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `assets/${policyId}${assetName}/addresses?count=100${appendCursorString}`,
        this._amountsAsStrings
      );
      if (status === 200) {
        const data = timestampedData.data;
        const pageAddressesWithQuantity: {
          address: string;
          quantity: string;
        }[] = data.map((a) => {
          return { address: a.address, quantity: a.amount };
        });
        const nextCursor = timestampedData.next_cursor;
        const addedData = [
          ...addressesWithQuantity,
          ...pageAddressesWithQuantity,
        ];
        return nextCursor == null
          ? addedData
          : paginateAddresses(nextCursor, addedData);
      }

      throw parseHttpError(timestampedData);
    };

    try {
      return await paginateAddresses();
    } catch (error) {
      return [];
    }
  }

  async fetchAssetMetadata(asset: string): Promise<AssetMetadata> {
    try {
      const { policyId, assetName } = parseAssetUnit(asset);
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `assets/${policyId}${assetName}`
      );

      if (status === 200) {
        const data = timestampedData.data;
        return <AssetMetadata>{
          ...data.asset_standards.cip25_metadata,
          ...data.asset_standards.cip68_metadata,
        };
      }

      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchBlockInfo(hash: string): Promise<BlockInfo> {
    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `blocks/${hash}`,
        this._amountsAsStrings
      );

      if (status === 200) {
        const data = timestampedData.data;
        return <BlockInfo>{
          confirmations: data.confirmations,
          epoch: data.epoch,
          epochSlot: data.epoch_slot.toString(),
          fees: data.total_fees,
          hash: data.hash,
          nextBlock: data.next_block ?? '',
          operationalCertificate: data.operational_certificate?.hot_vkey,
          output: data.total_output_lovelace ?? '0',
          previousBlock: data.previous_block,
          size: data.size,
          slot: data.absolute_slot.toString(),
          slotLeader: data.block_producer ?? '',
          time: Date.parse(data.timestamp) / 1000,
          txCount: data.tx_hashes.length,
          VRFKey: csl.VRFVKey.from_hex(data.vrf_key).to_bech32('vrf_vk'),
        };
      }

      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchCollectionAssets(
    policyId: string,
    cursor?: string
  ): Promise<{ assets: Asset[]; next: string | number | null }> {
    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `policy/${policyId}/assets?count=100${
          cursor ? `&cursor=${cursor}` : ''
        }`
      );

      if (status === 200) {
        const data = timestampedData.data;
        return {
          assets: data.map((asset) => ({
            unit: policyId + asset.asset_name,
            quantity: asset.total_supply,
          })),
          next: timestampedData.next_cursor,
        };
      }

      throw parseHttpError(timestampedData);
    } catch (error) {
      return { assets: [], next: null };
    }
  }

  async fetchHandleAddress(handle: string): Promise<string> {
    try {
      const handleWithoutDollar =
        handle.charAt(0) === '$' ? handle.substring(1) : handle;
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `ecosystem/adahandle/${handleWithoutDollar}`
      );

      if (status === 200) return timestampedData.data;

      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchProtocolParameters(epoch = Number.NaN): Promise<Protocol> {
    if (!isNaN(epoch))
      throw new Error(
        'Maestro only supports fetching Protocol parameters of the latest completed epoch.'
      );

    // Decimal numbers in Maestro are given as ratio of two numbers represented by string of format "firstNumber/secondNumber".
    const decimalFromRationalString = (str: string): number => {
      const forwardSlashIndex = str.indexOf('/');
      return (
        parseInt(str.slice(0, forwardSlashIndex)) /
        parseInt(str.slice(forwardSlashIndex + 1))
      );
    };
    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        'protocol-params'
      );
      if (status === 200) {
        const data = timestampedData.data;
        try {
          const { data: timestampedDataEpochData, status: epochStatus } =
            await this._axiosInstance.get('epochs/current');
          if (epochStatus === 200) {
            const epochData = timestampedDataEpochData.data;
            return <Protocol>{
              coinsPerUTxOSize: data.coins_per_utxo_byte.toString(),
              collateralPercent: parseInt(data.collateral_percentage),
              decentralisation: 0, // Deprecated in Babbage era.
              epoch: parseInt(epochData.epoch_no),
              keyDeposit: data.stake_key_deposit.toString(),
              maxBlockExMem:
                data.max_execution_units_per_block.memory.toString(),
              maxBlockExSteps:
                data.max_execution_units_per_block.steps.toString(),
              maxBlockHeaderSize: parseInt(data.max_block_header_size),
              maxBlockSize: parseInt(data.max_block_body_size),
              maxCollateralInputs: parseInt(data.max_collateral_inputs),
              maxTxExMem:
                data.max_execution_units_per_transaction.memory.toString(),
              maxTxExSteps:
                data.max_execution_units_per_transaction.steps.toString(),
              maxTxSize: parseInt(data.max_tx_size),
              maxValSize: data.max_value_size.toString(),
              minFeeA: data.min_fee_coefficient,
              minFeeB: data.min_fee_constant,
              minPoolCost: data.min_pool_cost.toString(),
              poolDeposit: data.pool_deposit.toString(),
              priceMem: decimalFromRationalString(data.prices.memory),
              priceStep: decimalFromRationalString(data.prices.steps),
            };
          }
          throw parseHttpError(timestampedDataEpochData);
        } catch (error) {
          throw parseHttpError(error);
        }
      }
      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchTxInfo(hash: string): Promise<TransactionInfo> {
    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `transactions/${hash}`
      );

      if (status === 200) {
        const data = timestampedData.data;
        return <TransactionInfo>{
          block: data.block_hash,
          deposit: data.deposit.toString(),
          fees: data.fee.toString(),
          hash: data.tx_hash,
          index: data.block_tx_index,
          invalidAfter: data.invalid_hereafter ?? '',
          invalidBefore: data.invalid_before ?? '',
          slot: data.block_absolute_slot.toString(),
          size: data.size - 1,
        };
      }
      throw parseHttpError(timestampedData);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchUTxOs(hash: string): Promise<UTxO[]> {
    try {
      const { data: timestampedData, status } = await this._axiosInstance.get(
        `transactions/${hash}`,
        this._amountsAsStrings
      );
      if (status === 200) {
        const msOutputs = timestampedData.data.outputs as MaestroUTxO[];
        const outputs = msOutputs.map(this.toUTxO);
        return outputs;
      }
      throw parseHttpError(timestampedData);
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
        this.submitUrl,
        toBytes(tx),
        { headers }
      );

      if (status === 202) return data;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  private toUTxO = (utxo: MaestroUTxO): UTxO => ({
    input: {
      outputIndex: utxo.index,
      txHash: utxo.tx_hash,
    },
    output: {
      address: utxo.address,
      amount: utxo.assets.map((asset) => ({
        unit: asset.unit,
        quantity: asset.amount,
      })),
      dataHash: utxo.datum?.hash,
      plutusData: utxo.datum?.bytes,
      scriptRef: this.resolveScript(utxo),
      scriptHash: utxo.reference_script?.hash,
    },
  });

  private resolveScript = (utxo: MaestroUTxO) => {
    if (utxo.reference_script) {
      const script =
        utxo.reference_script.type === 'native'
          ? <NativeScript>utxo.reference_script.json
          : <PlutusScript>{
              code: utxo.reference_script.bytes,
              version: utxo.reference_script.type.replace('plutusv', 'V'),
            };
      return toScriptRef(script).to_hex();
    } else return undefined;
  };
}

type MaestroDatumOptionType = 'hash' | 'inline';

type MaestroDatumOption = {
  type: MaestroDatumOptionType;
  hash: string;
  bytes?: string; // Hex encoded datum CBOR bytes (`null` if datum type is `hash` and corresponding datum bytes have not been seen on-chain).
  json?: Json;
};

type MaestroScriptType = 'native' | 'plutusv1' | 'plutusv2';

type Json = any;

type MaestroScript = {
  hash: string;
  type: MaestroScriptType;
  bytes?: string; // Script bytes (`null` if `native` script).
  json?: Json;
};

type MaestroAsset = {
  unit: string;
  amount: string;
};

type MaestroUTxO = {
  tx_hash: string;
  index: number;
  assets: Array<MaestroAsset>;
  address: string;
  datum?: MaestroDatumOption;
  reference_script?: MaestroScript;
  // Other fields such as `slot` & `txout_cbor` are ignored.
};
