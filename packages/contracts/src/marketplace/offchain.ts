import { MeshTxInitiator, MeshTxInitiatorInput } from '@mesh/common';
import {
  serializeBech32Address,
  ConStr0,
  PubKeyAddress,
  conStr0,
  pubKeyAddress,
  Integer,
  CurrencySymbol,
  TokenName,
  currencySymbol,
  tokenName,
  integer,
  applyObjParamsToScript,
  v2ScriptToBech32,
  mConStr1,
  parseDatumCbor,
  parsePlutusAddressObjToBech32,
  mConStr0,
} from '@meshsdk/mesh-csl';
import blueprint from './aiken-workspace/plutus.json';
import {
  Data,
  Quantity,
  UTxO,
  Unit,
  keepRelevant,
  largestFirst,
  parseAssetUnit,
} from '@meshsdk/core';

export type MarketplaceDatum = ConStr0<
  [PubKeyAddress, Integer, CurrencySymbol, TokenName]
>;
export const marketplaceDatum = (
  sellerAddress: string,
  lovelaceFee: number,
  assetHex: string
): MarketplaceDatum => {
  const { pubKeyHash, stakeCredential } = serializeBech32Address(sellerAddress);
  const { policyId, assetName } = parseAssetUnit(assetHex);
  return conStr0([
    pubKeyAddress(pubKeyHash, stakeCredential),
    integer(lovelaceFee),
    currencySymbol(policyId),
    tokenName(assetName),
  ]);
};

export class MeshMarketplaceContract extends MeshTxInitiator {
  ownerAddress: string;
  feePercentageBasisPoint: number;
  scriptCbor: string;

  constructor(
    inputs: MeshTxInitiatorInput,
    ownerAddress: string,
    feePercentageBasisPoint: number
  ) {
    super(inputs);
    this.ownerAddress = ownerAddress;
    this.feePercentageBasisPoint = feePercentageBasisPoint;
    const { pubKeyHash, stakeCredential } =
      serializeBech32Address(ownerAddress);
    this.scriptCbor = applyObjParamsToScript(
      blueprint.validators[0].compiledCode,
      [
        pubKeyAddress(pubKeyHash, stakeCredential),
        integer(feePercentageBasisPoint),
      ]
    );
  }

  listAsset = async (asset: string, price: number) => {
    const { utxos, walletAddress } = await this.getWalletInfoForTx();

    const assetMap = new Map<Unit, Quantity>();
    assetMap.set(asset, '1');
    const selectedUtxos = keepRelevant(assetMap, utxos);

    const scriptAddr = v2ScriptToBech32(
      this.scriptCbor,
      undefined,
      this.networkId
    );

    const tokenForSale = [{ unit: asset, quantity: '1' }];
    const outputDatum = marketplaceDatum(walletAddress, price, asset);

    await this.mesh
      .txOut(scriptAddr, tokenForSale)
      // TODO: remove dodgy cast
      .txOutInlineDatumValue(outputDatum as unknown as Data, 'JSON')
      .changeAddress(walletAddress)
      .selectUtxosFrom(selectedUtxos)
      .complete();

    return this.mesh.txHex;
  };

  delistAsset = async (marketplaceUtxo: UTxO) => {
    const { utxos, walletAddress, collateral } =
      await this.getWalletInfoForTx();

    await this.mesh
      .spendingPlutusScriptV2()
      .txIn(
        marketplaceUtxo.input.txHash,
        marketplaceUtxo.input.outputIndex,
        marketplaceUtxo.output.amount,
        marketplaceUtxo.output.address
      )
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(mConStr1([]))
      .txInScript(this.scriptCbor)
      .changeAddress(walletAddress)
      .requiredSignerHash(serializeBech32Address(walletAddress).pubKeyHash)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address
      )
      .selectUtxosFrom(utxos)
      .complete();

    return this.mesh.txHex;
  };

  purchaseAsset = async (marketplaceUtxo: UTxO) => {
    const { utxos, walletAddress, collateral } =
      await this.getWalletInfoForTx();

    const inputDatum = parseDatumCbor<MarketplaceDatum>(
      marketplaceUtxo.output.plutusData!
    );

    const listingPrice = inputDatum.fields[1].int.toString();
    const selectedUtxos = largestFirst(listingPrice, utxos, true);

    // const inputLovelace = marketplaceUtxo.output.amount.find(
    //   (a) => a.unit === 'lovelace'
    // )!.quantity;

    const tx = this.mesh
      .spendingPlutusScriptV2()
      .txIn(
        marketplaceUtxo.input.txHash,
        marketplaceUtxo.input.outputIndex,
        marketplaceUtxo.output.amount,
        marketplaceUtxo.output.address
      )
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(mConStr0([]))
      .txInScript(this.scriptCbor)
      .changeAddress(walletAddress)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address
      )
      .selectUtxosFrom(selectedUtxos);

    let ownerToReceiveLovelace =
      (inputDatum.fields[1].int * this.feePercentageBasisPoint) / 10000;
    if (this.feePercentageBasisPoint > 0 && ownerToReceiveLovelace < 1000000) {
      ownerToReceiveLovelace = 1000000;
    }

    if (ownerToReceiveLovelace > 0) {
      console.log(7, 'ownerToReceiveLovelace', ownerToReceiveLovelace);
      const ownerAddress = this.ownerAddress;
      const ownerToReceive = [
        {
          unit: 'lovelace',
          quantity: Math.ceil(ownerToReceiveLovelace).toString(),
        },
      ];
      tx.txOut(ownerAddress, ownerToReceive);
    }

    const sellerToReceiveLovelace =
      inputDatum.fields[1].int - ownerToReceiveLovelace;

    if (sellerToReceiveLovelace > 0) {
      console.log(8, 'sellerToReceiveLovelace', sellerToReceiveLovelace);
      const sellerAddress = parsePlutusAddressObjToBech32(inputDatum.fields[0]);
      const sellerToReceive = [
        {
          unit: 'lovelace',
          quantity: sellerToReceiveLovelace.toString(),
        },
      ];
      tx.txOut(sellerAddress, sellerToReceive);
    }
    await tx.complete();

    return this.mesh.txHex;
  };

  relistAsset = async (marketplaceUtxo: UTxO, newPrice: number) => {
    const { utxos, walletAddress, collateral } =
      await this.getWalletInfoForTx();
    const inputAsset = marketplaceUtxo.output.amount.find(
      (a) => a.unit !== 'lovelace'
    )!.unit;

    const tokenForSale = [{ unit: inputAsset, quantity: '1' }];
    const outputDatum = marketplaceDatum(walletAddress, newPrice, inputAsset);

    const scriptAddr = v2ScriptToBech32(
      this.scriptCbor,
      undefined,
      this.networkId
    );

    await this.mesh
      .spendingPlutusScriptV2()
      .txIn(
        marketplaceUtxo.input.txHash,
        marketplaceUtxo.input.outputIndex,
        marketplaceUtxo.output.amount,
        marketplaceUtxo.output.address
      )
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(mConStr1([]))
      .txInScript(this.scriptCbor)
      .txOut(scriptAddr, tokenForSale)
      // TODO: remove dodgy cast
      .txOutInlineDatumValue(outputDatum as unknown as Data, 'JSON')
      .changeAddress(walletAddress)
      .requiredSignerHash(serializeBech32Address(walletAddress).pubKeyHash)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address
      )
      .selectUtxosFrom(utxos)
      .complete();

    return this.mesh.txHex;
  };

  getUtxoByTxHash = async (txHash: string): Promise<UTxO | undefined> => {
    return await this._getUtxoByTxHash(this.scriptCbor, txHash);
  };
}
