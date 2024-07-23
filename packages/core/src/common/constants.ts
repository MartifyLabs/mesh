import { csl } from '@mesh/core';
import type { Costmdls } from '@mesh/core';
import type { Budget, Era, Network, Protocol } from './types';

export const DEFAULT_REDEEMER_BUDGET: Budget = {
  mem: 7_000_000,
  steps: 3_000_000_000,
};

export const DEFAULT_PROTOCOL_PARAMETERS: Protocol = {
  epoch: 0,
  coinsPerUTxOSize: '4310',
  priceMem: 0.0577,
  priceStep: 0.0000721,
  minFeeA: 44,
  minFeeB: 155381,
  keyDeposit: '2000000',
  maxTxSize: 16384,
  maxValSize: '5000',
  poolDeposit: '500000000',
  maxCollateralInputs: 3,
  decentralisation: 0,
  maxBlockSize: 98304,
  collateralPercent: 150,
  maxBlockHeaderSize: 1100,
  minPoolCost: '340000000',
  maxTxExMem: '16000000',
  maxTxExSteps: '10000000000',
  maxBlockExMem: '80000000',
  maxBlockExSteps: '40000000000',
};

export const HARDENED_KEY_START = 0x80000000;

export const LANGUAGE_VERSIONS = {
  V1: csl.Language.new_plutus_v1(),
  V2: csl.Language.new_plutus_v2(),
};

export const POLICY_ID_LENGTH = 56;

export const REDEEMER_TAGS = {
  CERT: csl.RedeemerTag.new_cert(),
  MINT: csl.RedeemerTag.new_mint(),
  REWARD: csl.RedeemerTag.new_reward(),
  SPEND: csl.RedeemerTag.new_spend(),
};

export const SUPPORTED_CLOCKS: Record<Network, [
  epoch: string,
  slot: string,
  systemStart: string,
  epochLength: string,
]> = {
  testnet: ['74', '1598400', '1595967616', '432000'],
  preview: ['183', '15811222', '1682467200', '86400'],
  preprod: ['65', '26438400', '1682121600', '432000'],
  mainnet: ['208', '4492800', '1596059091', '432000'],
};

export const SUPPORTED_COST_MODELS: Record<Era, Costmdls> = {
  ALONZO: csl.TxBuilderConstants.plutus_alonzo_cost_models(),
  BABBAGE: (() => {
    const babbageCostModels = csl.Costmdls.new();

    const v1CostModel = csl.CostModel.new();
    Object.values({
      'addInteger-cpu-arguments-intercept': 205665,
      'addInteger-cpu-arguments-slope': 812,
      'addInteger-memory-arguments-intercept': 1,
      'addInteger-memory-arguments-slope': 1,
      'appendByteString-cpu-arguments-intercept': 1000,
      'appendByteString-cpu-arguments-slope': 571,
      'appendByteString-memory-arguments-intercept': 0,
      'appendByteString-memory-arguments-slope': 1,
      'appendString-cpu-arguments-intercept': 1000,
      'appendString-cpu-arguments-slope': 24177,
      'appendString-memory-arguments-intercept': 4,
      'appendString-memory-arguments-slope': 1,
      'bData-cpu-arguments': 1000,
      'bData-memory-arguments': 32,
      'blake2b_256-cpu-arguments-intercept': 117366,
      'blake2b_256-cpu-arguments-slope': 10475,
      'blake2b_256-memory-arguments': 4,
      'cekApplyCost-exBudgetCPU': 23000,
      'cekApplyCost-exBudgetMemory': 100,
      'cekBuiltinCost-exBudgetCPU': 23000,
      'cekBuiltinCost-exBudgetMemory': 100,
      'cekConstCost-exBudgetCPU': 23000,
      'cekConstCost-exBudgetMemory': 100,
      'cekDelayCost-exBudgetCPU': 23000,
      'cekDelayCost-exBudgetMemory': 100,
      'cekForceCost-exBudgetCPU': 23000,
      'cekForceCost-exBudgetMemory': 100,
      'cekLamCost-exBudgetCPU': 23000,
      'cekLamCost-exBudgetMemory': 100,
      'cekStartupCost-exBudgetCPU': 100,
      'cekStartupCost-exBudgetMemory': 100,
      'cekVarCost-exBudgetCPU': 23000,
      'cekVarCost-exBudgetMemory': 100,
      'chooseData-cpu-arguments': 19537,
      'chooseData-memory-arguments': 32,
      'chooseList-cpu-arguments': 175354,
      'chooseList-memory-arguments': 32,
      'chooseUnit-cpu-arguments': 46417,
      'chooseUnit-memory-arguments': 4,
      'consByteString-cpu-arguments-intercept': 221973,
      'consByteString-cpu-arguments-slope': 511,
      'consByteString-memory-arguments-intercept': 0,
      'consByteString-memory-arguments-slope': 1,
      'constrData-cpu-arguments': 89141,
      'constrData-memory-arguments': 32,
      'decodeUtf8-cpu-arguments-intercept': 497525,
      'decodeUtf8-cpu-arguments-slope': 14068,
      'decodeUtf8-memory-arguments-intercept': 4,
      'decodeUtf8-memory-arguments-slope': 2,
      'divideInteger-cpu-arguments-constant': 196500,
      'divideInteger-cpu-arguments-model-arguments-intercept': 453240,
      'divideInteger-cpu-arguments-model-arguments-slope': 220,
      'divideInteger-memory-arguments-intercept': 0,
      'divideInteger-memory-arguments-minimum': 1,
      'divideInteger-memory-arguments-slope': 1,
      'encodeUtf8-cpu-arguments-intercept': 1000,
      'encodeUtf8-cpu-arguments-slope': 28662,
      'encodeUtf8-memory-arguments-intercept': 4,
      'encodeUtf8-memory-arguments-slope': 2,
      'equalsByteString-cpu-arguments-constant': 245000,
      'equalsByteString-cpu-arguments-intercept': 216773,
      'equalsByteString-cpu-arguments-slope': 62,
      'equalsByteString-memory-arguments': 1,
      'equalsData-cpu-arguments-intercept': 1060367,
      'equalsData-cpu-arguments-slope': 12586,
      'equalsData-memory-arguments': 1,
      'equalsInteger-cpu-arguments-intercept': 208512,
      'equalsInteger-cpu-arguments-slope': 421,
      'equalsInteger-memory-arguments': 1,
      'equalsString-cpu-arguments-constant': 187000,
      'equalsString-cpu-arguments-intercept': 1000,
      'equalsString-cpu-arguments-slope': 52998,
      'equalsString-memory-arguments': 1,
      'fstPair-cpu-arguments': 80436,
      'fstPair-memory-arguments': 32,
      'headList-cpu-arguments': 43249,
      'headList-memory-arguments': 32,
      'iData-cpu-arguments': 1000,
      'iData-memory-arguments': 32,
      'ifThenElse-cpu-arguments': 80556,
      'ifThenElse-memory-arguments': 1,
      'indexByteString-cpu-arguments': 57667,
      'indexByteString-memory-arguments': 4,
      'lengthOfByteString-cpu-arguments': 1000,
      'lengthOfByteString-memory-arguments': 10,
      'lessThanByteString-cpu-arguments-intercept': 197145,
      'lessThanByteString-cpu-arguments-slope': 156,
      'lessThanByteString-memory-arguments': 1,
      'lessThanEqualsByteString-cpu-arguments-intercept': 197145,
      'lessThanEqualsByteString-cpu-arguments-slope': 156,
      'lessThanEqualsByteString-memory-arguments': 1,
      'lessThanEqualsInteger-cpu-arguments-intercept': 204924,
      'lessThanEqualsInteger-cpu-arguments-slope': 473,
      'lessThanEqualsInteger-memory-arguments': 1,
      'lessThanInteger-cpu-arguments-intercept': 208896,
      'lessThanInteger-cpu-arguments-slope': 511,
      'lessThanInteger-memory-arguments': 1,
      'listData-cpu-arguments': 52467,
      'listData-memory-arguments': 32,
      'mapData-cpu-arguments': 64832,
      'mapData-memory-arguments': 32,
      'mkCons-cpu-arguments': 65493,
      'mkCons-memory-arguments': 32,
      'mkNilData-cpu-arguments': 22558,
      'mkNilData-memory-arguments': 32,
      'mkNilPairData-cpu-arguments': 16563,
      'mkNilPairData-memory-arguments': 32,
      'mkPairData-cpu-arguments': 76511,
      'mkPairData-memory-arguments': 32,
      'modInteger-cpu-arguments-constant': 196500,
      'modInteger-cpu-arguments-model-arguments-intercept': 453240,
      'modInteger-cpu-arguments-model-arguments-slope': 220,
      'modInteger-memory-arguments-intercept': 0,
      'modInteger-memory-arguments-minimum': 1,
      'modInteger-memory-arguments-slope': 1,
      'multiplyInteger-cpu-arguments-intercept': 69522,
      'multiplyInteger-cpu-arguments-slope': 11687,
      'multiplyInteger-memory-arguments-intercept': 0,
      'multiplyInteger-memory-arguments-slope': 1,
      'nullList-cpu-arguments': 60091,
      'nullList-memory-arguments': 32,
      'quotientInteger-cpu-arguments-constant': 196500,
      'quotientInteger-cpu-arguments-model-arguments-intercept': 453240,
      'quotientInteger-cpu-arguments-model-arguments-slope': 220,
      'quotientInteger-memory-arguments-intercept': 0,
      'quotientInteger-memory-arguments-minimum': 1,
      'quotientInteger-memory-arguments-slope': 1,
      'remainderInteger-cpu-arguments-constant': 196500,
      'remainderInteger-cpu-arguments-model-arguments-intercept': 453240,
      'remainderInteger-cpu-arguments-model-arguments-slope': 220,
      'remainderInteger-memory-arguments-intercept': 0,
      'remainderInteger-memory-arguments-minimum': 1,
      'remainderInteger-memory-arguments-slope': 1,
      'sha2_256-cpu-arguments-intercept': 806990,
      'sha2_256-cpu-arguments-slope': 30482,
      'sha2_256-memory-arguments': 4,
      'sha3_256-cpu-arguments-intercept': 1927926,
      'sha3_256-cpu-arguments-slope': 82523,
      'sha3_256-memory-arguments': 4,
      'sliceByteString-cpu-arguments-intercept': 265318,
      'sliceByteString-cpu-arguments-slope': 0,
      'sliceByteString-memory-arguments-intercept': 4,
      'sliceByteString-memory-arguments-slope': 0,
      'sndPair-cpu-arguments': 85931,
      'sndPair-memory-arguments': 32,
      'subtractInteger-cpu-arguments-intercept': 205665,
      'subtractInteger-cpu-arguments-slope': 812,
      'subtractInteger-memory-arguments-intercept': 1,
      'subtractInteger-memory-arguments-slope': 1,
      'tailList-cpu-arguments': 41182,
      'tailList-memory-arguments': 32,
      'trace-cpu-arguments': 212342,
      'trace-memory-arguments': 32,
      'unBData-cpu-arguments': 31220,
      'unBData-memory-arguments': 32,
      'unConstrData-cpu-arguments': 32696,
      'unConstrData-memory-arguments': 32,
      'unIData-cpu-arguments': 43357,
      'unIData-memory-arguments': 32,
      'unListData-cpu-arguments': 32247,
      'unListData-memory-arguments': 32,
      'unMapData-cpu-arguments': 38314,
      'unMapData-memory-arguments': 32,
      'verifyEd25519Signature-cpu-arguments-intercept': 57996947,
      'verifyEd25519Signature-cpu-arguments-slope': 18975,
      'verifyEd25519Signature-memory-arguments': 10
    }).forEach((cost, operation) =>
      v1CostModel.set(operation, csl.Int.new_i32(cost))
    );

    const v2CostModel = csl.CostModel.new();
    Object.values({
      'addInteger-cpu-arguments-intercept': 205665,
      'addInteger-cpu-arguments-slope': 812,
      'addInteger-memory-arguments-intercept': 1,
      'addInteger-memory-arguments-slope': 1,
      'appendByteString-cpu-arguments-intercept': 1000,
      'appendByteString-cpu-arguments-slope': 571,
      'appendByteString-memory-arguments-intercept': 0,
      'appendByteString-memory-arguments-slope': 1,
      'appendString-cpu-arguments-intercept': 1000,
      'appendString-cpu-arguments-slope': 24177,
      'appendString-memory-arguments-intercept': 4,
      'appendString-memory-arguments-slope': 1,
      'bData-cpu-arguments': 1000,
      'bData-memory-arguments': 32,
      'blake2b_256-cpu-arguments-intercept': 117366,
      'blake2b_256-cpu-arguments-slope': 10475,
      'blake2b_256-memory-arguments': 4,
      'cekApplyCost-exBudgetCPU': 23000,
      'cekApplyCost-exBudgetMemory': 100,
      'cekBuiltinCost-exBudgetCPU': 23000,
      'cekBuiltinCost-exBudgetMemory': 100,
      'cekConstCost-exBudgetCPU': 23000,
      'cekConstCost-exBudgetMemory': 100,
      'cekDelayCost-exBudgetCPU': 23000,
      'cekDelayCost-exBudgetMemory': 100,
      'cekForceCost-exBudgetCPU': 23000,
      'cekForceCost-exBudgetMemory': 100,
      'cekLamCost-exBudgetCPU': 23000,
      'cekLamCost-exBudgetMemory': 100,
      'cekStartupCost-exBudgetCPU': 100,
      'cekStartupCost-exBudgetMemory': 100,
      'cekVarCost-exBudgetCPU': 23000,
      'cekVarCost-exBudgetMemory': 100,
      'chooseData-cpu-arguments': 19537,
      'chooseData-memory-arguments': 32,
      'chooseList-cpu-arguments': 175354,
      'chooseList-memory-arguments': 32,
      'chooseUnit-cpu-arguments': 46417,
      'chooseUnit-memory-arguments': 4,
      'consByteString-cpu-arguments-intercept': 221973,
      'consByteString-cpu-arguments-slope': 511,
      'consByteString-memory-arguments-intercept': 0,
      'consByteString-memory-arguments-slope': 1,
      'constrData-cpu-arguments': 89141,
      'constrData-memory-arguments': 32,
      'decodeUtf8-cpu-arguments-intercept': 497525,
      'decodeUtf8-cpu-arguments-slope': 14068,
      'decodeUtf8-memory-arguments-intercept': 4,
      'decodeUtf8-memory-arguments-slope': 2,
      'divideInteger-cpu-arguments-constant': 196500,
      'divideInteger-cpu-arguments-model-arguments-intercept': 453240,
      'divideInteger-cpu-arguments-model-arguments-slope': 220,
      'divideInteger-memory-arguments-intercept': 0,
      'divideInteger-memory-arguments-minimum': 1,
      'divideInteger-memory-arguments-slope': 1,
      'encodeUtf8-cpu-arguments-intercept': 1000,
      'encodeUtf8-cpu-arguments-slope': 28662,
      'encodeUtf8-memory-arguments-intercept': 4,
      'encodeUtf8-memory-arguments-slope': 2,
      'equalsByteString-cpu-arguments-constant': 245000,
      'equalsByteString-cpu-arguments-intercept': 216773,
      'equalsByteString-cpu-arguments-slope': 62,
      'equalsByteString-memory-arguments': 1,
      'equalsData-cpu-arguments-intercept': 1060367,
      'equalsData-cpu-arguments-slope': 12586,
      'equalsData-memory-arguments': 1,
      'equalsInteger-cpu-arguments-intercept': 208512,
      'equalsInteger-cpu-arguments-slope': 421,
      'equalsInteger-memory-arguments': 1,
      'equalsString-cpu-arguments-constant': 187000,
      'equalsString-cpu-arguments-intercept': 1000,
      'equalsString-cpu-arguments-slope': 52998,
      'equalsString-memory-arguments': 1,
      'fstPair-cpu-arguments': 80436,
      'fstPair-memory-arguments': 32,
      'headList-cpu-arguments': 43249,
      'headList-memory-arguments': 32,
      'iData-cpu-arguments': 1000,
      'iData-memory-arguments': 32,
      'ifThenElse-cpu-arguments': 80556,
      'ifThenElse-memory-arguments': 1,
      'indexByteString-cpu-arguments': 57667,
      'indexByteString-memory-arguments': 4,
      'lengthOfByteString-cpu-arguments': 1000,
      'lengthOfByteString-memory-arguments': 10,
      'lessThanByteString-cpu-arguments-intercept': 197145,
      'lessThanByteString-cpu-arguments-slope': 156,
      'lessThanByteString-memory-arguments': 1,
      'lessThanEqualsByteString-cpu-arguments-intercept': 197145,
      'lessThanEqualsByteString-cpu-arguments-slope': 156,
      'lessThanEqualsByteString-memory-arguments': 1,
      'lessThanEqualsInteger-cpu-arguments-intercept': 204924,
      'lessThanEqualsInteger-cpu-arguments-slope': 473,
      'lessThanEqualsInteger-memory-arguments': 1,
      'lessThanInteger-cpu-arguments-intercept': 208896,
      'lessThanInteger-cpu-arguments-slope': 511,
      'lessThanInteger-memory-arguments': 1,
      'listData-cpu-arguments': 52467,
      'listData-memory-arguments': 32,
      'mapData-cpu-arguments': 64832,
      'mapData-memory-arguments': 32,
      'mkCons-cpu-arguments': 65493,
      'mkCons-memory-arguments': 32,
      'mkNilData-cpu-arguments': 22558,
      'mkNilData-memory-arguments': 32,
      'mkNilPairData-cpu-arguments': 16563,
      'mkNilPairData-memory-arguments': 32,
      'mkPairData-cpu-arguments': 76511,
      'mkPairData-memory-arguments': 32,
      'modInteger-cpu-arguments-constant': 196500,
      'modInteger-cpu-arguments-model-arguments-intercept': 453240,
      'modInteger-cpu-arguments-model-arguments-slope': 220,
      'modInteger-memory-arguments-intercept': 0,
      'modInteger-memory-arguments-minimum': 1,
      'modInteger-memory-arguments-slope': 1,
      'multiplyInteger-cpu-arguments-intercept': 69522,
      'multiplyInteger-cpu-arguments-slope': 11687,
      'multiplyInteger-memory-arguments-intercept': 0,
      'multiplyInteger-memory-arguments-slope': 1,
      'nullList-cpu-arguments': 60091,
      'nullList-memory-arguments': 32,
      'quotientInteger-cpu-arguments-constant': 196500,
      'quotientInteger-cpu-arguments-model-arguments-intercept': 453240,
      'quotientInteger-cpu-arguments-model-arguments-slope': 220,
      'quotientInteger-memory-arguments-intercept': 0,
      'quotientInteger-memory-arguments-minimum': 1,
      'quotientInteger-memory-arguments-slope': 1,
      'remainderInteger-cpu-arguments-constant': 196500,
      'remainderInteger-cpu-arguments-model-arguments-intercept': 453240,
      'remainderInteger-cpu-arguments-model-arguments-slope': 220,
      'remainderInteger-memory-arguments-intercept': 0,
      'remainderInteger-memory-arguments-minimum': 1,
      'remainderInteger-memory-arguments-slope': 1,
      'serialiseData-cpu-arguments-intercept': 1159724,
      'serialiseData-cpu-arguments-slope': 392670,
      'serialiseData-memory-arguments-intercept': 0,
      'serialiseData-memory-arguments-slope': 2,
      'sha2_256-cpu-arguments-intercept': 806990,
      'sha2_256-cpu-arguments-slope': 30482,
      'sha2_256-memory-arguments': 4,
      'sha3_256-cpu-arguments-intercept': 1927926,
      'sha3_256-cpu-arguments-slope': 82523,
      'sha3_256-memory-arguments': 4,
      'sliceByteString-cpu-arguments-intercept': 265318,
      'sliceByteString-cpu-arguments-slope': 0,
      'sliceByteString-memory-arguments-intercept': 4,
      'sliceByteString-memory-arguments-slope': 0,
      'sndPair-cpu-arguments': 85931,
      'sndPair-memory-arguments': 32,
      'subtractInteger-cpu-arguments-intercept': 205665,
      'subtractInteger-cpu-arguments-slope': 812,
      'subtractInteger-memory-arguments-intercept': 1,
      'subtractInteger-memory-arguments-slope': 1,
      'tailList-cpu-arguments': 41182,
      'tailList-memory-arguments': 32,
      'trace-cpu-arguments': 212342,
      'trace-memory-arguments': 32,
      'unBData-cpu-arguments': 31220,
      'unBData-memory-arguments': 32,
      'unConstrData-cpu-arguments': 32696,
      'unConstrData-memory-arguments': 32,
      'unIData-cpu-arguments': 43357,
      'unIData-memory-arguments': 32,
      'unListData-cpu-arguments': 32247,
      'unListData-memory-arguments': 32,
      'unMapData-cpu-arguments': 38314,
      'unMapData-memory-arguments': 32,
      'verifyEcdsaSecp256k1Signature-cpu-arguments': 35892428,
      'verifyEcdsaSecp256k1Signature-memory-arguments': 10,
      'verifyEd25519Signature-cpu-arguments-intercept': 57996947,
      'verifyEd25519Signature-cpu-arguments-slope': 18975,
      'verifyEd25519Signature-memory-arguments': 10,
      'verifySchnorrSecp256k1Signature-cpu-arguments-intercept': 38887044,
      'verifySchnorrSecp256k1Signature-cpu-arguments-slope': 32947,
      'verifySchnorrSecp256k1Signature-memory-arguments': 10
    }).forEach((cost, operation) =>
      v2CostModel.set(operation, csl.Int.new_i32(cost))
    );

    babbageCostModels.insert(csl.Language.new_plutus_v1(), v1CostModel);
    babbageCostModels.insert(csl.Language.new_plutus_v2(), v2CostModel);

    return babbageCostModels;
  })(),
};

export const SUPPORTED_LANGUAGE_VIEWS: Record<
  Era, Partial<Record<keyof typeof LANGUAGE_VERSIONS, string>>
> = {
  ALONZO: {
    V1: 'a141005901d59f1a000302590001011a00060bc719026d00011a000249f01903e800011a000249f018201a0025cea81971f70419744d186419744d186419744d186419744d186419744d186419744d18641864186419744d18641a000249f018201a000249f018201a000249f018201a000249f01903e800011a000249f018201a000249f01903e800081a000242201a00067e2318760001011a000249f01903e800081a000249f01a0001b79818f7011a000249f0192710011a0002155e19052e011903e81a000249f01903e8011a000249f018201a000249f018201a000249f0182001011a000249f0011a000249f0041a000194af18f8011a000194af18f8011a0002377c190556011a0002bdea1901f1011a000249f018201a000249f018201a000249f018201a000249f018201a000249f018201a000249f018201a000242201a00067e23187600010119f04c192bd200011a000249f018201a000242201a00067e2318760001011a000242201a00067e2318760001011a0025cea81971f704001a000141bb041a000249f019138800011a000249f018201a000302590001011a000249f018201a000249f018201a000249f018201a000249f018201a000249f018201a000249f018201a000249f018201a00330da70101ff',
  },
  BABBAGE: {
    V1: 'a141005901b69f1a0003236119032c01011903e819023b00011903e8195e7104011903e818201a0001ca761928eb041959d818641959d818641959d818641959d818641959d818641959d81864186418641959d81864194c5118201a0002acfa182019b551041a000363151901ff00011a00015c3518201a000797751936f404021a0002ff941a0006ea7818dc0001011903e8196ff604021a0003bd081a00034ec5183e011a00102e0f19312a011a00032e801901a5011a0002da781903e819cf06011a00013a34182019a8f118201903e818201a00013aac0119e143041903e80a1a00030219189c011a00030219189c011a0003207c1901d9011a000330001901ff0119ccf3182019fd40182019ffd5182019581e18201940b318201a00012adf18201a0002ff941a0006ea7818dc0001011a00010f92192da7000119eabb18201a0002ff941a0006ea7818dc0001011a0002ff941a0006ea7818dc0001011a000c504e197712041a001d6af61a0001425b041a00040c660004001a00014fab18201a0003236119032c010119a0de18201a00033d7618201979f41820197fb8182019a95d1820197df718201995aa18201a009063b91903fd0aff',
    V2: 'a20198af1a0003236119032c01011903e819023b00011903e8195e7104011903e818201a0001ca761928eb041959d818641959d818641959d818641959d818641959d818641959d81864186418641959d81864194c5118201a0002acfa182019b551041a000363151901ff00011a00015c3518201a000797751936f404021a0002ff941a0006ea7818dc0001011903e8196ff604021a0003bd081a00034ec5183e011a00102e0f19312a011a00032e801901a5011a0002da781903e819cf06011a00013a34182019a8f118201903e818201a00013aac0119e143041903e80a1a00030219189c011a00030219189c011a0003207c1901d9011a000330001901ff0119ccf3182019fd40182019ffd5182019581e18201940b318201a00012adf18201a0002ff941a0006ea7818dc0001011a00010f92192da7000119eabb18201a0002ff941a0006ea7818dc0001011a0002ff941a0006ea7818dc0001011a0011b22c1a0005fdde00021a000c504e197712041a001d6af61a0001425b041a00040c660004001a00014fab18201a0003236119032c010119a0de18201a00033d7618201979f41820197fb8182019a95d1820197df718201995aa18201b00000004a817c8001b00000004a817c8001a009063b91903fd0a1b00000004a817c800001b00000004a817c80041005901b69f1a0003236119032c01011903e819023b00011903e8195e7104011903e818201a0001ca761928eb041959d818641959d818641959d818641959d818641959d818641959d81864186418641959d81864194c5118201a0002acfa182019b551041a000363151901ff00011a00015c3518201a000797751936f404021a0002ff941a0006ea7818dc0001011903e8196ff604021a0003bd081a00034ec5183e011a00102e0f19312a011a00032e801901a5011a0002da781903e819cf06011a00013a34182019a8f118201903e818201a00013aac0119e143041903e80a1a00030219189c011a00030219189c011a0003207c1901d9011a000330001901ff0119ccf3182019fd40182019ffd5182019581e18201940b318201a00012adf18201a0002ff941a0006ea7818dc0001011a00010f92192da7000119eabb18201a0002ff941a0006ea7818dc0001011a0002ff941a0006ea7818dc0001011a000c504e197712041a001d6af61a0001425b041a00040c660004001a00014fab18201a0003236119032c010119a0de18201a00033d7618201979f41820197fb8182019a95d1820197df718201995aa18201a009063b91903fd0aff',
  },
};

export const SUPPORTED_HANDLES: Record<number, string> = {
  [csl.NetworkInfo.testnet().network_id()]: '8d18d786e92776c824607fd8e193ec535c79dc61ea2405ddf3b09fe3',
  [csl.NetworkInfo.mainnet().network_id()]: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
};

export const SUPPORTED_OGMIOS_LINKS: Record<Network, string> = {
  mainnet: 'wss://ogmios-api.mainnet.dandelion.link',
  preprod: 'wss://ogmios-api.iohk-preprod.dandelion.link',
  preview: '__TBD_SOON_TM__',
  testnet: 'wss://ogmios-api.testnet.dandelion.link',
};

export const SUPPORTED_TOKENS = {
  LQ: 'da8c30857834c6ae7203935b89278c532b3995245295456f993e1d244c51',
  MIN: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e',
  NTX: 'edfd7a1d77bcb8b884c474bdc92a16002d1fb720e454fa6e993444794e5458',
  iBTC: 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069425443',
  iETH: 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069455448',
  iUSD: 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344',
  MILK: '8a1cfae21368b8bebbbed9800fec304e95cce39a2a57dc35e2e3ebaa4d494c4b',
  AGIX: 'f43a62fdc3965df486de8a0d32fe800963589c41b38946602a0dc53541474958',
  MELD: '6ac8ef33b510ec004fe11585f7c5a9f0c07f0c23428ab4f29c1d7d104d454c44',
  INDY: '533bb94a8850ee3ccbe483106489399112b74c905342cb1792a797a0494e4459',
  CLAY: '38ad9dc3aec6a2f38e220142b9aa6ade63ebe71f65e7cc2b7d8a8535434c4159',
  MCOS: '6f46e1304b16d884c85c62fb0eef35028facdc41aaa0fd319a152ed64d434f53',
  DING: 'ce5b9e0f8a88255b65f2e4d065c6e716e9fa9a8a86dfb86423dd1ac044494e47',
  GERO: '10a49b996e2402269af553a8a96fb8eb90d79e9eca79e2b4223057b64745524f',
  NMKR: '5dac8536653edc12f6f5e1045d8164b9f59998d3bdc300fc928434894e4d4b52',
  PAVIA: '884892bcdc360bcef87d6b3f806e7f9cd5ac30d999d49970e7a903ae5041564941',
  HOSKY: 'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235484f534b59',
  YUMMI: '078eafce5cd7edafdf63900edef2c1ea759e77f30ca81d6bbdeec92479756d6d69',
  C3: '8e51398904a5d3fc129fbf4f1589701de23c7824d5c90fdb9490e15a434841524c4933',
  GIMBAL: '2b0a04a7b60132b1805b296c7fcb3b217ff14413991bf76f72663c3067696d62616c',
  SUNDAE: '9a9693a9a37912a5097918f97918d15240c92ab729a0b7c4aa144d7753554e444145',
  GREENS: '4623ab311b7d982d8d26fcbe1a9439ca56661aafcdcd8d8a0ef31fd6475245454e53',
  GENS: 'dda5fdb1002f7389b33e036b6afee82a8189becb6cba852e8b79b4fb0014df1047454e53',
  SOCIETY: '25f0fc240e91bd95dcdaebd2ba7713fc5168ac77234a3d79449fc20c534f4349455459',
  DJED: '8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344',
  SHEN: '8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd615368656e4d6963726f555344',
  WMT: '1d7f33bd23d85e1a25d87d86fac4f199c3197a2f7afeb662a0f34e1e776f726c646d6f62696c65746f6b656e',
  COPI: 'b6a7467ea1deb012808ef4e87b5ff371e85f7142d7b356a40d9b42a0436f726e75636f70696173205b76696120436861696e506f72742e696f5d',
};

export const SUPPORTED_WALLETS = [
  'begin', 'eternl', 'flint', 'lace', 'nami', 'nufi', 'gerowallet', 'typhoncip30', 'vespr', 'yoroi', 'lucem'
];
