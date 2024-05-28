import { csl } from '../../core/index.js';
import {
  LANGUAGE_VERSIONS,
  POLICY_ID_LENGTH,
  REDEEMER_TAGS,
} from '../../common/constants.js';
import {
  deserializeDataHash,
  deserializeEd25519KeyHash,
  deserializePlutusData,
  deserializePlutusScript,
  deserializeScriptHash,
  deserializeScriptRef,
  deserializeTxHash,
} from './deserializer.js';
import type {
  PlutusData,
  PlutusList,
  PlutusMap,
  RedeemerTag,
  ScriptRef,
  TransactionUnspentOutput,
  Value,
} from '../../core/index.js';
import type {
  Action,
  Asset,
  Data,
  NativeScript,
  PlutusScript,
  PoolParams,
  Relay,
  UTxO,
} from '../../common/types/index.js';

/* -----------------[ Address ]----------------- */

export const toAddress = (bech32: string) => csl.Address.from_bech32(bech32);

export const toBaseAddress = (bech32: string) =>
  csl.BaseAddress.from_address(toAddress(bech32));

export const toEnterpriseAddress = (bech32: string) =>
  csl.EnterpriseAddress.from_address(toAddress(bech32));

export const toRewardAddress = (bech32: string) =>
  csl.RewardAddress.from_address(toAddress(bech32));

/* -----------------[ Bytes ]----------------- */

export const fromBytes = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString('hex');

export const toBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 === 0 && /^[0-9A-F]*$/i.test(hex))
    return Buffer.from(hex, 'hex');

  return Buffer.from(hex, 'utf-8');
};

/* -----------------[ Lovelace ]----------------- */

export const fromLovelace = (lovelace: number) => lovelace / 1_000_000;

export const toLovelace = (ada: number) => ada * 1_000_000;

/* -----------------[ NativeScript ]----------------- */

export const fromNativeScript = (script: csl.NativeScript) => {
  const fromNativeScripts = (scripts: csl.NativeScripts) => {
    const nativeScripts = new Array<NativeScript>();

    for (let index = 0; index < scripts.len(); index += 1) {
      nativeScripts.push(fromNativeScript(scripts.get(index)));
    }

    return nativeScripts;
  };

  switch (script.kind()) {
    case csl.NativeScriptKind.ScriptAll: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const scriptAll = script.as_script_all()!;
      return <NativeScript>{
        type: 'all',
        scripts: fromNativeScripts(scriptAll.native_scripts()),
      };
    }
    case csl.NativeScriptKind.ScriptAny: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const scriptAny = script.as_script_any()!;
      return <NativeScript>{
        type: 'any',
        scripts: fromNativeScripts(scriptAny.native_scripts()),
      };
    }
    case csl.NativeScriptKind.ScriptNOfK: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const scriptNOfK = script.as_script_n_of_k()!;
      return <NativeScript>{
        type: 'atLeast',
        required: scriptNOfK.n(),
        scripts: fromNativeScripts(scriptNOfK.native_scripts()),
      };
    }
    case csl.NativeScriptKind.TimelockStart: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const timelockStart = script.as_timelock_start()!;
      return <NativeScript>{
        type: 'after',
        slot: timelockStart.slot_bignum().to_str(),
      };
    }
    case csl.NativeScriptKind.TimelockExpiry: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const timelockExpiry = script.as_timelock_expiry()!;
      return <NativeScript>{
        type: 'before',
        slot: timelockExpiry.slot_bignum().to_str(),
      };
    }
    case csl.NativeScriptKind.ScriptPubkey: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const scriptPubkey = script.as_script_pubkey()!;
      return <NativeScript>{
        type: 'sig',
        keyHash: scriptPubkey.addr_keyhash().to_hex(),
      };
    }
    default:
      throw new Error(`Script Kind: ${script.kind()}, is not supported`);
  }
};

export const toNativeScript = (script: NativeScript) => {
  const toNativeScripts = (scripts: NativeScript[]) => {
    const nativeScripts = csl.NativeScripts.new();

    scripts.forEach((script) => {
      nativeScripts.add(toNativeScript(script));
    });

    return nativeScripts;
  };

  switch (script.type) {
    case 'all':
      return csl.NativeScript.new_script_all(
        csl.ScriptAll.new(toNativeScripts(script.scripts))
      );
    case 'any':
      return csl.NativeScript.new_script_any(
        csl.ScriptAny.new(toNativeScripts(script.scripts))
      );
    case 'atLeast':
      return csl.NativeScript.new_script_n_of_k(
        csl.ScriptNOfK.new(script.required, toNativeScripts(script.scripts))
      );
    case 'after':
      return csl.NativeScript.new_timelock_start(
        csl.TimelockStart.new_timelockstart(csl.BigNum.from_str(script.slot))
      );
    case 'before':
      return csl.NativeScript.new_timelock_expiry(
        csl.TimelockExpiry.new_timelockexpiry(csl.BigNum.from_str(script.slot))
      );
    case 'sig':
      return csl.NativeScript.new_script_pubkey(
        csl.ScriptPubkey.new(deserializeEd25519KeyHash(script.keyHash))
      );
  }
};

/* -----------------[ PlutusData ]----------------- */

export const fromPlutusData = (plutusData: PlutusData) => {
  const fromPlutusList = (plutusList: PlutusList) => {
    const dataList: Data[] = [];
    for (let index = 0; index < plutusList.len(); index += 1) {
      dataList.push(fromPlutusData(plutusList.get(index)));
    }

    return dataList;
  };

  const fromPlutusMap = (plutusMap: PlutusMap) => {
    const dataMap = new Map<Data, Data>();
    for (let index = 0; index < plutusMap.len(); index += 1) {
      const key = plutusMap.keys().get(index);
      const value =
        plutusMap.get(key) ??
        csl.PlutusData.from_hex(fromUTF8('NO_ITEM_FOUND_INSIDE_GOLD_ROOM'));

      dataMap.set(fromPlutusData(key), fromPlutusData(value));
    }

    return dataMap;
  };

  switch (plutusData.kind()) {
    case csl.PlutusDataKind.Bytes:
      return fromBytes(plutusData.as_bytes() ?? new Uint8Array());
    case csl.PlutusDataKind.Integer:
      return parseInt(plutusData.as_integer()?.to_str() ?? '0', 10);
    case csl.PlutusDataKind.List:
      return fromPlutusList(plutusData.as_list() ?? csl.PlutusList.new());
    case csl.PlutusDataKind.Map:
      return fromPlutusMap(plutusData.as_map() ?? csl.PlutusMap.new());
    case csl.PlutusDataKind.ConstrPlutusData:
      return <Data>{
        alternative: parseInt(
          plutusData.as_constr_plutus_data()?.alternative().to_str() ?? '0',
          10
        ),
        fields: fromPlutusList(
          plutusData.as_constr_plutus_data()?.data() ?? csl.PlutusList.new()
        ),
      };
    default:
      throw new Error(
        `PlutusData Kind: ${plutusData.kind()}, is not supported`
      );
  }
};

export const toPlutusData = (data: Data) => {
  const toPlutusList = (data: Data[]) => {
    const plutusList = csl.PlutusList.new();
    data.forEach((element) => {
      plutusList.add(toPlutusData(element));
    });

    return plutusList;
  };

  switch (typeof data) {
    case 'string':
      return csl.PlutusData.new_bytes(toBytes(data));
    case 'number':
      return csl.PlutusData.new_integer(csl.BigInt.from_str(data.toString()));
    case 'bigint':
      return csl.PlutusData.new_integer(csl.BigInt.from_str(data.toString()));
    case 'object':
      if (data instanceof Array) {
        const plutusList = toPlutusList(data);
        return csl.PlutusData.new_list(plutusList);
      } else if (data instanceof Map) {
        const plutusMap = csl.PlutusMap.new();
        data.forEach((value, key) => {
          plutusMap.insert(toPlutusData(key), toPlutusData(value));
        });
        return csl.PlutusData.new_map(plutusMap);
      } else {
        return csl.PlutusData.new_constr_plutus_data(
          csl.ConstrPlutusData.new(
            csl.BigNum.from_str(data.alternative.toString()),
            toPlutusList(data.fields)
          )
        );
      }
  }
};

/* -----------------[ PoolParams ]----------------- */

export const toPoolParams = (params: PoolParams) => {
  const relays = csl.Relays.new();
  params.relays.forEach((relay) => {
    relays.add(toRelay(relay));
  });

  throw new Error('toPoolParams not implemented.');
};

/* -----------------[ Redeemer ]----------------- */

export const toRedeemer = (action: Action) => {
  const lookupRedeemerTag = (key: string): RedeemerTag => REDEEMER_TAGS[key];

  return csl.Redeemer.new(
    lookupRedeemerTag(action.tag),
    csl.BigNum.from_str(action.index.toString()),
    toPlutusData(action.data),
    csl.ExUnits.new(
      csl.BigNum.from_str(action.budget.mem.toString()),
      csl.BigNum.from_str(action.budget.steps.toString())
    )
  );
};

/* -----------------[ Relay ]----------------- */

export const toRelay = (relay: Relay) => {
  switch (relay.type) {
    case 'SingleHostAddr': {
      const IPV4 = relay.IPV4
        ? csl.Ipv4.new(
            new Uint8Array(relay.IPV4.split('.').map((b) => parseInt(b)))
          )
        : undefined;

      const IPV6 = relay.IPV6
        ? csl.Ipv6.new(toBytes(relay.IPV6.replaceAll(':', '')))
        : undefined;

      return csl.Relay.new_single_host_addr(
        csl.SingleHostAddr.new(relay.port, IPV4, IPV6)
      );
    }
    case 'SingleHostName':
      return csl.Relay.new_single_host_name(
        csl.SingleHostName.new(
          relay.port,
          csl.DNSRecordAorAAAA.new(relay.domainName)
        )
      );
    case 'MultiHostName':
      return csl.Relay.new_multi_host_name(
        csl.MultiHostName.new(csl.DNSRecordSRV.new(relay.domainName))
      );
  }
};

/* -----------------[ ScriptRef ]----------------- */

export const fromScriptRef = (scriptRef: ScriptRef) => {
  if (scriptRef.is_plutus_script()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const plutusScript = scriptRef.plutus_script()!;

    return <PlutusScript>{
      code: plutusScript.to_hex(),
      version: Object.keys(LANGUAGE_VERSIONS).find(
        (key) =>
          LANGUAGE_VERSIONS[key].to_hex() ===
          plutusScript.language_version().to_hex()
      ),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const nativeScript = scriptRef.native_script()!;

  return fromNativeScript(nativeScript);
};

export const toScriptRef = (script: PlutusScript | NativeScript) => {
  if ('code' in script) {
    const plutusScript = deserializePlutusScript(script.code, script.version);

    return csl.ScriptRef.new_plutus_script(plutusScript);
  }

  return csl.ScriptRef.new_native_script(toNativeScript(script));
};

/* -----------------[ TransactionUnspentOutput ]----------------- */

export const fromTxUnspentOutput = (
  txUnspentOutput: TransactionUnspentOutput
) => {
  const dataHash = txUnspentOutput.output().has_data_hash()
    ? txUnspentOutput.output().data_hash()?.to_hex()
    : undefined;

  const plutusData = txUnspentOutput.output().has_plutus_data()
    ? txUnspentOutput.output().plutus_data()?.to_hex()
    : undefined;

  const scriptRef = txUnspentOutput.output().has_script_ref()
    ? txUnspentOutput.output().script_ref()?.to_hex()
    : undefined;

  return <UTxO>{
    input: {
      outputIndex: txUnspentOutput.input().index(),
      txHash: txUnspentOutput.input().transaction_id().to_hex(),
    },
    output: {
      address: txUnspentOutput.output().address().to_bech32(),
      amount: fromValue(txUnspentOutput.output().amount()),
      dataHash,
      plutusData,
      scriptRef,
    },
  };
};

export const toTxUnspentOutput = (utxo: UTxO) => {
  const txInput = csl.TransactionInput.new(
    deserializeTxHash(utxo.input.txHash),
    utxo.input.outputIndex
  );

  const txOutput = csl.TransactionOutput.new(
    toAddress(utxo.output.address),
    toValue(utxo.output.amount)
  );

  if (utxo.output.dataHash !== undefined) {
    txOutput.set_data_hash(deserializeDataHash(utxo.output.dataHash));
  }

  if (utxo.output.plutusData !== undefined) {
    txOutput.set_plutus_data(deserializePlutusData(utxo.output.plutusData));
  }

  if (utxo.output.scriptRef !== undefined) {
    txOutput.set_script_ref(deserializeScriptRef(utxo.output.scriptRef));
  }

  return csl.TransactionUnspentOutput.new(txInput, txOutput);
};

/* -----------------[ UnitInterval ]----------------- */

export const toUnitInterval = (float: string) => {
  const decimal = float.split('.')[1] ?? '0';

  const numerator = `${parseInt(decimal, 10)}`;
  const denominator = '1' + '0'.repeat(decimal.length);

  return csl.UnitInterval.new(
    csl.BigNum.from_str(numerator),
    csl.BigNum.from_str(denominator)
  );
};

/* -----------------[ UTF-8 ]----------------- */

export const fromUTF8 = (utf8: string) => {
  if (utf8.length % 2 === 0 && /^[0-9A-F]*$/i.test(utf8)) return utf8;

  return fromBytes(Buffer.from(utf8, 'utf-8'));
};

export const toUTF8 = (hex: string) =>
  Buffer.from(hex, 'hex').toString('utf-8');

/* -----------------[ Value ]----------------- */

export const fromValue = (value: Value) => {
  const assets: Asset[] = [
    { unit: 'lovelace', quantity: value.coin().to_str() },
  ];

  const multiAsset = value.multiasset();
  if (multiAsset !== undefined) {
    const policies = multiAsset.keys();
    for (let i = 0; i < policies.len(); i += 1) {
      const policyId = policies.get(i);
      const policyAssets = multiAsset.get(policyId);
      if (policyAssets !== undefined) {
        const policyAssetNames = policyAssets.keys();
        for (let j = 0; j < policyAssetNames.len(); j += 1) {
          const assetName = policyAssetNames.get(j);
          const quantity =
            policyAssets.get(assetName) ?? csl.BigNum.from_str('0');
          const assetId = policyId.to_hex() + fromBytes(assetName.name());
          assets.push({ unit: assetId, quantity: quantity.to_str() });
        }
      }
    }
  }

  return assets;
};

export const toValue = (assets: Asset[]) => {
  const lovelace = assets.find((asset) => asset.unit === 'lovelace');
  const policies = Array.from(
    new Set<string>(
      assets
        .filter((asset) => asset.unit !== 'lovelace')
        .map((asset) => asset.unit.slice(0, POLICY_ID_LENGTH))
    )
  );

  const multiAsset = csl.MultiAsset.new();
  policies.forEach((policyId) => {
    const policyAssets = csl.Assets.new();
    assets
      .filter((asset) => asset.unit.slice(0, POLICY_ID_LENGTH) === policyId)
      .forEach((asset) => {
        policyAssets.insert(
          csl.AssetName.new(toBytes(asset.unit.slice(POLICY_ID_LENGTH))),
          csl.BigNum.from_str(asset.quantity)
        );
      });

    multiAsset.insert(deserializeScriptHash(policyId), policyAssets);
  });

  const value = csl.Value.new(
    csl.BigNum.from_str(lovelace ? lovelace.quantity : '0')
  );

  if (assets.length > 1 || !lovelace) {
    value.set_multiasset(multiAsset);
  }

  return value;
};
