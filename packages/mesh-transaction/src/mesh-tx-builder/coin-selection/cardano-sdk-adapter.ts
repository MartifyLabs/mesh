import CardanoSelection from '@cardano-sdk/input-selection';
import {Cardano as CSDK, Serialization} from "@cardano-sdk/core";
import {HexBlob} from "@cardano-sdk/util"
import {BuilderCallbacks, IInputSelector, SelectionResult} from "./coin-selection-interface"
import {Asset, TxIn, UTxO} from "@meshsdk/common";

export class CardanoSdkInputSelector implements IInputSelector {
    private readonly constraints: BuilderCallbacks;

    constructor(constraints: BuilderCallbacks) {
        this.constraints = constraints;
    }

    async select(utxos: Set<UTxO>): Promise<SelectionResult> {
        const utxoMap = new Map<string, UTxO>();
        for (const utxo of utxos) {
            utxoMap.set(`${utxo.input.txHash}#${utxo.input.outputIndex}`, utxo);
        }

        const selector = CardanoSelection.roundRobinRandomImprove({
            changeAddressResolver: this.constraints.,
        });
        const selectResult = await selector.select({});
        return Promise.resolve(undefined);
    }
}

const meshTxInToCSDKUtxo = (txIn: TxIn): CSDK.Utxo => {
    return [
        {
            txId: <CSDK.TransactionId> txIn.txIn.txHash,
            index: txIn.txIn.txIndex,
            address: <CSDK.PaymentAddress>txIn.txIn.address,
        },
        {
            address: <CSDK.PaymentAddress>txIn.txIn.address,
            value: meshAssetsToCSDKValue(txIn.txIn.amount),
        }
    ]
}

const meshUtxoToCSDKUtxo = (utxo: UTxO): CSDK.Utxo => {
    return [
        {
            txId: <CSDK.TransactionId>utxo.input.txHash,
            index: utxo.input.outputIndex,
            address: <CSDK.PaymentAddress>utxo.output.address,
        },
        {
            address: <CSDK.PaymentAddress>utxo.output.address,
            value: meshAssetsToCSDKValue(utxo.output.amount),
            datumHash: meshDataHashToCSDKDataHash(utxo.output.dataHash),
            datum: meshDatumToCSDKDatum(utxo.output.plutusData),
            scriptReference: meshScriptReferenceToCSDKScriptReference(utxo.output.scriptRef),
        }
    ]
}

const meshScriptReferenceToCSDKScriptReference = (scriptReference?: string): CSDK.Script | undefined => {
    if (scriptReference == null) {
        return undefined;
    }

    return Serialization.Script.fromCbor(<HexBlob>scriptReference).toCore();
}

const meshDatumToCSDKDatum = (datum?: string): CSDK.PlutusData | undefined => {
    if (datum == null) {
        return undefined;
    }

    return Serialization.PlutusData.fromCbor(<HexBlob>datum).toCore();
}

const meshDataHashToCSDKDataHash = (hash?: string): CSDK.DatumHash | undefined => {
    if (hash == null) {
        return undefined;
    }
    return <CSDK.DatumHash>hash;
}

const meshAssetsToCSDKValue = (assets?: Asset[]): CSDK.Value => {
    if (assets == null) {
        throw new Error("Missing required assets. Be sure that you resolve all required utxos");
    }

    let lovelace = 0n;
    let sdkAssets = new Map<CSDK.AssetId, bigint>();
    for (const asset of assets) {
        if (asset.unit === 'lovelace' || asset.unit === '') {
            lovelace = BigInt(asset.quantity);
        } else {
            const assetId = CSDK.AssetId.fromParts(
                <CSDK.PolicyId>asset.unit.substring(0, 56),
                <CSDK.AssetName>asset.unit.substring(56)
            );
            sdkAssets.set(assetId, BigInt(asset.quantity));
        }
    }
    if (assets.length === 0) {
        return {
            coins: lovelace,
        }
    }
    return {
        coins: lovelace,
        assets: sdkAssets,
    }
}
