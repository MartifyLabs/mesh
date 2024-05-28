import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { SUPPORTED_HANDLES } from '../common/constants.js';
import { IFetcher, IListener, ISubmitter } from '../common/contracts/index.js';
import {
  deserializeNativeScript,
  fromNativeScript,
  fromUTF8,
  parseAssetUnit,
  parseHttpError,
  resolveRewardAddress,
  toBytes,
  toScriptRef,
  toUTF8,
} from '../common/utils/index.js';
import type {
  AccountInfo,
  Asset,
  AssetMetadata,
  BlockInfo,
  PlutusScript,
  Protocol,
  TransactionInfo,
  UTxO,
} from '../common/types/index.js';

export class KoiosProvider implements IFetcher, IListener, ISubmitter {
  private readonly _axiosInstance: AxiosInstance;

  constructor(baseUrl: string);
  constructor(
    network: 'api' | 'preview' | 'preprod' | 'guild',
    token: string,
    version?: number
  );

  constructor(...args: unknown[]) {
    if (typeof args[0] === 'string' && args[0].startsWith('http')) {
      this._axiosInstance = axios.create({
        baseURL: args[0],
        headers: {
          Authorization: `Bearer ${args[1]}`,
        },
      });
    } else {
      let version = 1;
      if (typeof args[2] === 'number') {
        version = args[2];
      }

      const config: CreateAxiosDefaults = {
        baseURL: `https://${args[0]}.koios.rest/api/v${version}`,
      };

      if (typeof args[1] === 'string') {
        config.headers = {
          Authorization: `Bearer ${args[1]}`,
        };
      }

      this._axiosInstance = axios.create(config);
    }
  }

  async fetchAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const rewardAddress = address.startsWith('addr')
        ? resolveRewardAddress(address)
        : address;

      const { data, status } = await this._axiosInstance.post('account_info', {
        _stake_addresses: [rewardAddress],
      });

      if (status === 200)
        return <AccountInfo>{
          poolId: data[0].delegated_pool,
          active: data[0].status === 'registered',
          balance: data[0].total_balance.toString(),
          rewards: data[0].rewards_available,
          withdrawals: data[0].withdrawals,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchAddressUTxOs(address: string, asset?: string): Promise<UTxO[]> {
    try {
      const { data, status } = await this._axiosInstance.post('address_info', {
        _addresses: [address],
      });

      if (status === 200) {
        const utxos = <UTxO[]>(
          data
            .flatMap((info: { utxo_set: [] }) => info.utxo_set)
            .map((utxo) => this.toUTxO(utxo, address))
        );

        return asset !== undefined
          ? utxos.filter(
              (utxo) =>
                utxo.output.amount.find((a) => a.unit === asset) !== undefined
            )
          : utxos;
      }

      throw parseHttpError(data);
    } catch (error) {
      return [];
    }
  }

  async fetchAssetAddresses(
    asset: string
  ): Promise<{ address: string; quantity: string }[]> {
    try {
      const { policyId, assetName } = parseAssetUnit(asset);
      const { data, status } = await this._axiosInstance.get(
        `asset_address_list?_asset_policy=${policyId}&_asset_name=${assetName}`
      );

      if (status === 200)
        return data.map((item) => ({
          address: item.payment_address,
          quantity: item.quantity,
        }));

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchAssetMetadata(asset: string): Promise<AssetMetadata> {
    try {
      const { policyId, assetName } = parseAssetUnit(asset);
      const { data, status } = await this._axiosInstance.get(
        `asset_info?_asset_policy=${policyId}&_asset_name=${assetName}`
      );

      if (status === 200)
        return <AssetMetadata>{
          ...data[0].minting_tx_metadata[721][policyId][toUTF8(assetName)],
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchBlockInfo(hash: string): Promise<BlockInfo> {
    try {
      const { data, status } = await this._axiosInstance.post('block_info', {
        _block_hashes: [hash],
      });

      if (status === 200)
        return <BlockInfo>{
          confirmations: data[0].num_confirmations,
          epoch: data[0].epoch_no,
          epochSlot: data[0].epoch_slot.toString(),
          fees: data[0].total_fees ?? '',
          hash: data[0].hash,
          nextBlock: data[0].child_hash ?? '',
          operationalCertificate: data[0].op_cert,
          output: data[0].total_output ?? '0',
          previousBlock: data[0].parent_hash,
          size: data[0].block_size,
          slot: data[0].abs_slot.toString(),
          slotLeader: data[0].pool ?? '',
          time: data[0].block_time,
          txCount: data[0].tx_count,
          VRFKey: data[0].vrf_key,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchCollectionAssets(
    policyId: string,
    cursor = 0
  ): Promise<{ assets: Asset[]; next: string | number | null }> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `asset_policy_info?_asset_policy=${policyId}&limit=100&offset=${cursor}`
      );

      if (status === 200)
        return {
          assets: data.map((asset) => ({
            unit: `${policyId}${asset.asset_name}`,
            quantity: asset.total_supply,
          })),
          next: data.length === 100 ? cursor + 100 : null,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchHandleAddress(handle: string): Promise<string> {
    try {
      const assetName = fromUTF8(handle.replace('$', ''));
      const { data, status } = await this._axiosInstance.get(
        `asset_address_list?_asset_policy=${SUPPORTED_HANDLES[1]}&_asset_name=${assetName}`
      );

      if (status === 200) return data[0].payment_address;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchProtocolParameters(epoch: number): Promise<Protocol> {
    try {
      const { data, status } = await this._axiosInstance.get(
        `epoch_params?_epoch_no=${epoch}`
      );

      if (status === 200)
        return <Protocol>{
          coinsPerUTxOSize: data[0].coins_per_utxo_size,
          collateralPercent: data[0].collateral_percent,
          decentralisation: data[0].decentralisation,
          epoch: data[0].epoch_no,
          keyDeposit: data[0].key_deposit,
          maxBlockExMem: data[0].max_block_ex_mem.toString(),
          maxBlockExSteps: data[0].max_block_ex_steps.toString(),
          maxBlockHeaderSize: data[0].max_bh_size,
          maxBlockSize: data[0].max_block_size,
          maxCollateralInputs: data[0].max_collateral_inputs,
          maxTxExMem: data[0].max_tx_ex_mem.toString(),
          maxTxExSteps: data[0].max_tx_ex_steps.toString(),
          maxTxSize: data[0].max_tx_size,
          maxValSize: data[0].max_val_size.toString(),
          minFeeA: data[0].min_fee_a,
          minFeeB: data[0].min_fee_b,
          minPoolCost: data[0].min_pool_cost,
          poolDeposit: data[0].pool_deposit,
          priceMem: data[0].price_mem,
          priceStep: data[0].price_step,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchTxInfo(hash: string): Promise<TransactionInfo> {
    try {
      const { data, status } = await this._axiosInstance.post('tx_info', {
        _tx_hashes: [hash],
      });

      if (status === 200)
        return <TransactionInfo>{
          block: data[0].block_hash,
          deposit: data[0].deposit,
          fees: data[0].fee,
          hash: data[0].tx_hash,
          index: data[0].tx_block_index,
          invalidAfter: data[0].invalid_after?.toString() ?? '',
          invalidBefore: data[0].invalid_before?.toString() ?? '',
          slot: data[0].absolute_slot.toString(),
          size: data[0].tx_size,
        };

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  async fetchUTxOs(hash: string): Promise<UTxO[]> {
    try {
      // TODO: Implement the fetcher
      const { data, status } = await this._axiosInstance.post('tx_info', {
        _tx_hashes: [hash],
      });
      if (status === 200) {
        const utxos = data[0].outputs.map((utxo) =>
          this.toUTxO(utxo, utxo.payment_addr.bech32)
        );
        return utxos;
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
        'submittx',
        toBytes(tx),
        { headers }
      );

      if (status === 202) return data;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }

  private toUTxO(utxo, address: string): UTxO {
    return {
      input: {
        outputIndex: utxo.tx_index,
        txHash: utxo.tx_hash,
      },
      output: {
        address: address,
        amount: [
          { unit: 'lovelace', quantity: utxo.value },
          ...utxo.asset_list.map(
            (a) =>
              <Asset>{
                unit: `${a.policy_id}${a.asset_name}`,
                quantity: `${a.quantity}`,
              }
          ),
        ],
        dataHash: utxo.datum_hash ?? undefined,
        plutusData: utxo.inline_datum?.bytes ?? undefined,
        scriptRef: this.resolveScriptRef(utxo.reference_script),
        scriptHash: utxo.reference_script?.hash ?? undefined,
      },
    };
  }

  private resolveScriptRef = (kScriptRef): string | undefined => {
    if (kScriptRef) {
      const script = kScriptRef.type.startsWith('plutus')
        ? <PlutusScript>{
            code: kScriptRef.bytes,
            version: kScriptRef.type.replace('plutus', ''),
          }
        : fromNativeScript(deserializeNativeScript(kScriptRef.bytes));

      return toScriptRef(script).to_hex();
    }

    return undefined;
  };
}
