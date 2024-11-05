import {
  applyCborEncoding,
  deserializeDatum,
  UTxO,
  mConStr0,
  resolveScriptHash,
  serializePlutusScript,
  serializeAddressObj,pubKeyAddress,
  mConStr1
} from '@meshsdk/core';

import { Address } from "@meshsdk/core-cst"

import { MeshTxInitiator, MeshTxInitiatorInput } from "../common";

import blueprint from "./plutus.json";

export const MeshAffirmationBlueprint = blueprint;
type scriptInfo ={ 
  code: string, version: "V3", address: string, policyId: string
}
export class MeshAffirmationContract extends MeshTxInitiator {
  constructor(inputs: MeshTxInitiatorInput) {
    super(inputs);
    this.languageVersion = 'V3';
  }

  // This just grabs the validator cbor and generates an address from it 
  getScript = (type: 'Mint' | 'Spend', beneficiaryKeyHash: string ,networkId: number ) => {
    const scriptCbor=applyCborEncoding(blueprint?.validators[type=='Mint'?0:1]?.compiledCode || '');
    const policyId = resolveScriptHash(scriptCbor, "V3");
    let script:scriptInfo = {policyId: policyId, code: scriptCbor, version: "V3", ...serializePlutusScript(
      {code: scriptCbor, version: "V3"},
      beneficiaryKeyHash,
      networkId
    )};
    return script;
  };

  affirm = async (beneficiary: any): Promise<string> => {
    const wallet = this.wallet;
    if (!wallet) throw new Error('Wallet is needed');
    const { utxos, walletAddress, collateral } =
    await this.getWalletInfoForTx();
    
    const rewardAddress = (await wallet.getRewardAddresses())[0];
    
    
    if (!rewardAddress) throw new Error('Reward address is needed');;
    const stakeAddrBech:string = walletAddress || '';
    const stakeAddr = Address.fromBech32(stakeAddrBech);

    const stakeAddrProps = stakeAddr.getProps();
    const stakeHash = stakeAddrProps.delegationPart?.hash || "";
    const stakeHashBin = Buffer.from(stakeHash,'hex');

    
    const mintingScript = this.getScript("Mint", beneficiary?.hash, await wallet.getNetworkId());
    if (!mintingScript.code) return '';
    const targetAddress = mintingScript.address;
    
    
    const firstUtxo = utxos[0];
    if (firstUtxo === undefined) throw new Error("No UTXOs available");
    const remainingUtxos = utxos.slice(1);

    const redeemer =mConStr0([]);
  
    // {data: { alternative: 0, fields: [] }};
    const myDatum= { alternative: 0, fields: [stakeHash] };
    
    await this.mesh
    .txIn(
      firstUtxo.input.txHash,
      firstUtxo.input.outputIndex,
      firstUtxo.output.amount,
      firstUtxo.output.address,
    )
    .mintPlutusScript(this.languageVersion)
    .mint("1", mintingScript.policyId, stakeHashBin.toString('hex'))
    .mintingScript(mintingScript.code)
    .mintRedeemerValue(redeemer)
    .txOut(targetAddress, [
      { unit: mintingScript.policyId + stakeHashBin.toString('hex'), quantity: "1" },
    ])
    .txOutInlineDatumValue(myDatum)
    .changeAddress(walletAddress)
    .txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address,
    )
    .selectUtxosFrom(remainingUtxos,'keepRelevant','0')
    .requiredSignerHash(stakeAddrProps.paymentPart?.hash || '')
    .requiredSignerHash(stakeHash)
  
    .complete();

    return this.mesh.txHex;
    
  };

  revoke = async (scriptUtxo: UTxO): Promise<string> => {
    const wallet = this.wallet;
    if (!wallet) throw new Error('Wallet is needed');

    const { utxos, walletAddress, collateral } =
    await this.getWalletInfoForTx();

    const rewardAddress = (await wallet.getRewardAddresses())[0];
    
    if (!rewardAddress) throw new Error('Reward address is needed');;
    const stakeAddrBech:string = walletAddress || '';
    const stakeAddr = Address.fromBech32(stakeAddrBech);
    const beneficiaryAddr = Address.fromBech32(scriptUtxo.output.address);
    const beneficiary = beneficiaryAddr.getProps().delegationPart;
    
    const stakeAddrProps = stakeAddr.getProps();
    const stakeHash = stakeAddrProps.delegationPart?.hash || "";
    const stakeHashBin = Buffer.from(stakeHash,'hex');
    
    const mintingScript = this.getScript("Mint", beneficiary?.hash || '', await wallet.getNetworkId());
    const spendingScript = this.getScript("Spend", beneficiary?.hash || '', await wallet.getNetworkId());
    if (!mintingScript.code) return '';
    
    await this.mesh
    .spendingPlutusScript(this.languageVersion)
    .txIn(
      scriptUtxo.input.txHash,
      scriptUtxo.input.outputIndex,
      scriptUtxo.output.amount,
      scriptUtxo.output.address,
    )
    .txInRedeemerValue(mConStr0([]))
    .spendingReferenceTxInInlineDatumPresent()
    .spendingReferenceTxInRedeemerValue("")
    .txInScript(spendingScript.code)
    .mintPlutusScript(this.languageVersion)
    .mint("-1", mintingScript.policyId, stakeHashBin.toString('hex'))
    .mintingScript(mintingScript.code)
    .mintRedeemerValue(mConStr1([]))
    .changeAddress(walletAddress)
    .txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address,
    )
    .selectUtxosFrom(utxos)
    .requiredSignerHash(stakeAddrProps.paymentPart?.hash || '')
    .requiredSignerHash(stakeHash)
    .complete();
    return this.mesh.txHex;
    
  };

}