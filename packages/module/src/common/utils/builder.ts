import { csl } from '../../core/index.js';
import {
  DEFAULT_PROTOCOL_PARAMETERS,
  DEFAULT_REDEEMER_BUDGET,
  LANGUAGE_VERSIONS,
} from '../../common/constants.js';
import {
  fromScriptRef,
  fromUTF8,
  toAddress,
  toBytes,
  toPlutusData,
  toRedeemer,
  toScriptRef,
  toTxUnspentOutput,
  toUnitInterval,
} from './converter.js';
import type {
  BaseAddress,
  Bip32PrivateKey,
  DataCost,
  DatumSource,
  Ed25519KeyHash,
  EnterpriseAddress,
  MintWitness,
  PlutusScriptSource,
  RewardAddress,
  TransactionBuilder,
  TransactionOutputBuilder,
  TransactionUnspentOutput,
  TxInputsBuilder,
} from '../../core/index.js';
import type {
  Action,
  Data,
  PlutusScript,
  Recipient,
  UTxO,
} from '../../common/types/index.js';
import {
  deserializeNativeScript,
  deserializePlutusScript,
} from './deserializer.js';

export const buildBaseAddress = (
  networkId: number,
  paymentKeyHash: Ed25519KeyHash,
  stakeKeyHash: Ed25519KeyHash
): BaseAddress => {
  return csl.BaseAddress.new(
    networkId,
    csl.StakeCredential.from_keyhash(paymentKeyHash),
    csl.StakeCredential.from_keyhash(stakeKeyHash)
  );
};

export const buildBip32PrivateKey = (
  entropy: string,
  password = ''
): Bip32PrivateKey => {
  return csl.Bip32PrivateKey.from_bip39_entropy(
    toBytes(entropy),
    toBytes(fromUTF8(password))
  );
};

export const buildDataCost = (coinsPerByte: string): DataCost => {
  return csl.DataCost.new_coins_per_byte(csl.BigNum.from_str(coinsPerByte));
};

export const buildDatumSource = (datum: Data | UTxO): DatumSource => {
  if (typeof datum !== 'object' || !('input' in datum)) {
    return csl.DatumSource.new(toPlutusData(datum));
  }

  const utxo = toTxUnspentOutput(datum);
  if (utxo.output().has_plutus_data()) {
    return csl.DatumSource.new_ref_input(utxo.input());
  }

  throw new Error(
    `No inline datum found in UTxO: ${utxo.input().transaction_id().to_hex()}`
  );
};

export const buildEnterpriseAddress = (
  networkId: number,
  paymentKeyHash: Ed25519KeyHash
): EnterpriseAddress => {
  return csl.EnterpriseAddress.new(
    networkId,
    csl.StakeCredential.from_keyhash(paymentKeyHash)
  );
};

export const buildGeneralTxMetadata = (metadata: Record<string, unknown>) => {
  const generalTxMetadata = csl.GeneralTransactionMetadata.new();

  Object.entries(metadata).forEach(([MetadataLabel, Metadata]) => {
    generalTxMetadata.insert(
      csl.BigNum.from_str(MetadataLabel),
      csl.encode_json_str_to_metadatum(
        JSON.stringify(Metadata),
        csl.MetadataJsonSchema.NoConversions
      )
    );
  });

  return generalTxMetadata;
};

export const buildMintWitness = (
  script: string | PlutusScript | UTxO,
  redeemer?: Partial<Action>
): MintWitness => {
  if (typeof script === 'string') {
    return csl.MintWitness.new_native_script(deserializeNativeScript(script));
  }

  if (redeemer === undefined)
    throw new Error('Minting with plutus requires a redeemer to be defined');

  if (redeemer.tag !== 'MINT')
    throw new Error("Minting redeemer's tag must be defined as 'MINT'");

  return csl.MintWitness.new_plutus_script(
    buildPlutusScriptSource(script),
    toRedeemer({
      tag: 'MINT',
      index: 0,
      budget: DEFAULT_REDEEMER_BUDGET,
      data: {
        alternative: 0,
        fields: [],
      },
      ...redeemer,
    })
  );
};

export const buildRewardAddress = (
  networkId: number,
  stakeKeyHash: Ed25519KeyHash
): RewardAddress => {
  return csl.RewardAddress.new(
    networkId,
    csl.StakeCredential.from_keyhash(stakeKeyHash)
  );
};

export const buildPlutusScriptSource = (
  script: PlutusScript | UTxO
): PlutusScriptSource => {
  if ('code' in script) {
    return csl.PlutusScriptSource.new(
      deserializePlutusScript(script.code, script.version)
    );
  }

  const utxo = toTxUnspentOutput(script);
  if (utxo.output().has_script_ref()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const scriptRef = utxo.output().script_ref()!;
    if (scriptRef.is_plutus_script()) {
      const plutusScript = fromScriptRef(scriptRef) as PlutusScript;
      const scriptHash = deserializePlutusScript(
        plutusScript.code,
        plutusScript.version
      ).hash();

      return csl.PlutusScriptSource.new_ref_input_with_lang_ver(
        scriptHash,
        utxo.input(),
        LANGUAGE_VERSIONS[plutusScript.version]
      );
    }
  }

  throw new Error(
    `No plutus script reference found in UTxO: ${utxo
      .input()
      .transaction_id()
      .to_hex()}`
  );
};

export const buildScriptPubkey = (keyHash: Ed25519KeyHash) => {
  const scriptPubkey = csl.ScriptPubkey.new(keyHash);
  return csl.NativeScript.new_script_pubkey(scriptPubkey);
};

export const buildTimelockExpiry = (slot: string) => {
  const expiry = csl.BigNum.from_str(slot);
  const timelockExpiry = csl.TimelockExpiry.new_timelockexpiry(expiry);
  return csl.NativeScript.new_timelock_expiry(timelockExpiry);
};

export const buildTimelockStart = (slot: string) => {
  const start = csl.BigNum.from_str(slot);
  const timelockStart = csl.TimelockStart.new_timelockstart(start);
  return csl.NativeScript.new_timelock_start(timelockStart);
};

export const buildTxBuilder = (
  parameters = DEFAULT_PROTOCOL_PARAMETERS
): TransactionBuilder => {
  const txBuilderConfig = csl.TransactionBuilderConfigBuilder.new()
    .coins_per_utxo_byte(csl.BigNum.from_str(parameters.coinsPerUTxOSize))
    .ex_unit_prices(
      csl.ExUnitPrices.new(
        toUnitInterval(parameters.priceMem.toString()),
        toUnitInterval(parameters.priceStep.toString())
      )
    )
    .fee_algo(
      csl.LinearFee.new(
        csl.BigNum.from_str(parameters.minFeeA.toString()),
        csl.BigNum.from_str(parameters.minFeeB.toString())
      )
    )
    .key_deposit(csl.BigNum.from_str(parameters.keyDeposit))
    .max_tx_size(parameters.maxTxSize)
    .max_value_size(parseInt(parameters.maxValSize, 10))
    .pool_deposit(csl.BigNum.from_str(parameters.poolDeposit))
    .build();

  return csl.TransactionBuilder.new(txBuilderConfig);
};

export const buildTxInputsBuilder = (utxos: unknown[]): TxInputsBuilder => {
  const txInputsBuilder = csl.TxInputsBuilder.new();

  utxos
    .map((utxo) => {
      return utxo instanceof csl.TransactionUnspentOutput
        ? (utxo as TransactionUnspentOutput)
        : toTxUnspentOutput(utxo as UTxO);
    })
    .forEach((utxo) => {
      txInputsBuilder.add_input(
        utxo.output().address(),
        utxo.input(),
        utxo.output().amount()
      );
    });

  return txInputsBuilder;
};

export const buildTxOutputBuilder = (
  recipient: Recipient
): TransactionOutputBuilder => {
  if (typeof recipient === 'string') {
    return csl.TransactionOutputBuilder.new().with_address(
      toAddress(recipient)
    );
  }

  let txOutputBuilder = csl.TransactionOutputBuilder.new().with_address(
    toAddress(recipient.address)
  );

  if (recipient.datum) {
    const { value, inline } = recipient.datum;

    const plutusData = toPlutusData(value);

    txOutputBuilder = txOutputBuilder.with_data_hash(
      csl.hash_plutus_data(plutusData)
    );

    if (inline) {
      txOutputBuilder = txOutputBuilder.with_plutus_data(plutusData);
    }
  }

  if (recipient.script) {
    const reference = toScriptRef(recipient.script);

    txOutputBuilder = txOutputBuilder.with_script_ref(reference);
  }

  return txOutputBuilder;
};
