import { useWallet } from "@meshsdk/react";

import Link from "~/components/link";
import LiveCodeDemo from "~/components/sections/live-code-demo";
import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";
import { getTxBuilder } from "../common";

export default function GovernanceDeregistration() {
  return (
    <TwoColumnsScroll
      sidebarTo="deregistration"
      title="DRep Retirement"
      leftSection={Left()}
      rightSection={Right()}
    />
  );
}

function Left() {
  let codeDrepId = ``;
  codeDrepId += `const dRep = await wallet.getDRep();\n`;
  codeDrepId += `const dRepId = dRep.dRepIDCip105;\n`;

  let codeTxInit = ``;
  codeTxInit += `const changeAddress = await wallet.getChangeAddress();\n`;
  codeTxInit += `const utxos = await wallet.getUtxos();\n`;
  codeTxInit += `\n`;
  codeTxInit += `const blockchainProvider = new BlockfrostProvider('<Your-API-Key>');\n`;
  codeTxInit += `\n`;
  codeTxInit += `const txBuilder = new MeshTxBuilder({\n`;
  codeTxInit += `  fetcher: blockchainProvider,\n`;
  codeTxInit += `  evaluator: blockchainProvider,\n`;
  codeTxInit += `});\n`;

  let codeTx = ``;
  codeTx += `txBuilder\n`;
  codeTx += `  .drepDeregistrationCertificate(dRepId)\n`;
  codeTx += `  .selectUtxosFrom(selectedUtxos)\n`;
  codeTx += `  .changeAddress(changeAddress);\n`;
  codeTx += `\n`;
  codeTx += `const unsignedTx = await txBuilder.complete();\n`;

  let codeSign = ``;
  codeSign += `const signedTx = await wallet.signTx(unsignedTx);\n`;
  codeSign += `const txHash = await wallet.submitTx(signedTx);\n`;

  return (
    <>
      <p>
        A DRep is retired right away when the blockchain accepts a retirement
        certificate. The deposit is refunded immediately as part of the
        output of the transaction that submits the retirement certificate, just
        like how deposits are returned when using a Conway stake deregistration.
      </p>
      <p>
        First we need to get the DRep ID of the DRep we want to retire. We can
        do this by calling <code>getDRep</code> method on the wallet. This will
        return the DRep object which contains the DRep ID.
      </p>
      <Codeblock data={codeDrepId} />
      <p>
        We then need to initialize the transaction builder by creating a new
        instance of <code>MeshTxBuilder</code>. We need to pass the{" "}
        <Link href="/providers">blockchain provider</Link> to the constructor.
      </p>
      <Codeblock data={codeTxInit} />
      <p>
        We can now build the transaction by adding the UTxOs as inputs to the
        transaction and adding the DRep deregistration certificate to the
        transaction.
      </p>
      <Codeblock data={codeTx} />
      <p>
        Finally we can sign the transaction and submit it to the blockchain.
      </p>
      <Codeblock data={codeSign} />
      <p>
        The transaction will be submitted to the blockchain and the DRep will be
        retired. The deposit will be refunded to the provided change address.
      </p>
    </>
  );
}

function Right() {
  const { wallet, connected } = useWallet();

  async function runDemo() {
    const dRep = await wallet.getDRep();

    if (dRep === undefined)
      throw new Error("No DRep key found, this wallet does not support CIP95");

    const dRepId = dRep.dRepIDCip105;

    const utxos = await wallet.getUtxos();
    const changeAddress = await wallet.getChangeAddress();

    const txBuilder = getTxBuilder();
    txBuilder
      .drepDeregistrationCertificate(dRepId)
      .selectUtxosFrom(utxos)
      .changeAddress(changeAddress);

    const unsignedTx = await txBuilder.complete();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    return txHash;
  }

  let codeSnippet = ``;
  codeSnippet += `const dRep = await wallet.getDRep();\n`;
  codeSnippet += `const dRepId = dRep.dRepIDCip105;\n`;
  codeSnippet += `\n`;
  codeSnippet += `const utxos = await wallet.getUtxos();\n`;
  codeSnippet += `const changeAddress = await wallet.getChangeAddress();\n`;
  codeSnippet += `\n`;
  codeSnippet += `txBuilder\n`;
  codeSnippet += `  .drepDeregistrationCertificate(dRepId)\n`;
  codeSnippet += `  .selectUtxosFrom(utxos)\n`;
  codeSnippet += `  .changeAddress(changeAddress);\n`;
  codeSnippet += `\n`;
  codeSnippet += `const unsignedTx = await txBuilder.complete();\n`;
  codeSnippet += `const signedTx = await wallet.signTx(unsignedTx);\n`;
  codeSnippet += `const txHash = await wallet.submitTx(signedTx);\n`;

  return (
    <LiveCodeDemo
      title="DRep Retirement"
      subtitle="Retire a DRep certificate amd return the deposit"
      code={codeSnippet}
      runCodeFunction={runDemo}
      disabled={!connected}
      runDemoButtonTooltip={
        !connected ? "Connect wallet to run this demo" : undefined
      }
      runDemoShowBrowseWalletConnect={true}
    ></LiveCodeDemo>
  );
}
