import { useState } from "react";

import { useWallet } from "@meshsdk/react";

import Input from "~/components/form/input";
import InputTable from "~/components/sections/input-table";
import LiveCodeDemo from "~/components/sections/live-code-demo";
import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";
import { getTxBuilder, txbuilderCode } from "../common";

export default function GovernanceVoteDelegation() {
  return (
    <TwoColumnsScroll
      sidebarTo="delegation"
      title="Vote Delegation"
      leftSection={Left()}
      rightSection={Right()}
    />
  );
}

function Left() {
  let codeGetWalletInfo = `const utxos = await wallet.getUtxos();\n`;
  codeGetWalletInfo += `const rewardAddresses = await wallet.getRewardAddresses();\n`;
  codeGetWalletInfo += `const rewardAddress = rewardAddresses[0];\n`;
  codeGetWalletInfo += `const changeAddress = await wallet.getChangeAddress();\n`;

  let codeTx = `txBuilder\n`;
  codeTx += `  .voteDelegationCertificate(\n`;
  codeTx += `    {\n`;
  codeTx += `      dRepId: drepid,\n`;
  codeTx += `    },\n`;
  codeTx += `    rewardAddress,\n`;
  codeTx += `  )\n`;
  codeTx += `  .changeAddress(changeAddress)\n`;
  codeTx += `  .selectUtxosFrom(utxos, "keepRelevant", "10000000")`;

  let codeBuildSign = `const unsignedTx = await txBuilder.complete();\n`;
  codeBuildSign += `const signedTx = await wallet.signTx(unsignedTx);\n`;
  codeBuildSign += `const txHash = await wallet.submitTx(signedTx);\n`;

  return (
    <>
      <p>
        Any wallet can delegate its voting power to another DRep. This is done
        by creating a vote delegation certificate and submitting it to the
        blockchain.
      </p>
      <p>
        First we need to get the wallet information. This includes the UTXOs,
        the reward address, and the change address.
      </p>
      <Codeblock data={codeGetWalletInfo} />
      <p>
        Next we need to select the UTXOs to use to pay for the transaction. We
        will select the UTXOs that have at least 5 ADA. Though the fee is less
        than 1 ADA.
      </p>
      <p>
        We can now start building the transaction. We will add the selected
        UTXOs as inputs to the transaction. We will also add the vote delegation
        certificate to the transaction. The vote delegation certificate requires
        the DRep ID of the DRep to delegate to and the reward address of the
        delegator. Note that we would need to have at least 5 ADA for the
        certificate delegation, in the <code>selectUtxosFrom</code> we will
        configure 10 ADA as threshold buffer.
      </p>
      <Codeblock data={codeTx} />
      <p>
        Finally we can build, sign the transaction and submit it to the
        blockchain.
      </p>
      <Codeblock data={codeBuildSign} />
      <p>
        The transaction will be submitted to the blockchain and the DRep will be
        registered. The deposit will be taken from the DRep owner and the DRep
        will be added to the list of registered DReps.
      </p>
    </>
  );
}

function Right() {
  const { wallet, connected } = useWallet();
  const [drepid, setDrepid] = useState<string>(
    "drep1yv4uesaj92wk8ljlsh4p7jzndnzrflchaz5fzug3zxg4naqkpeas3",
  );

  async function runDemo() {
    if (!connected) throw new Error("Wallet not connected");

    const utxos = await wallet.getUtxos();
    const rewardAddresses = await wallet.getRewardAddresses();
    const rewardAddress = rewardAddresses[0];
    if (rewardAddress === undefined) throw new Error("No reward address found");

    const changeAddress = await wallet.getChangeAddress();

    const txBuilder = getTxBuilder();

    txBuilder
      .voteDelegationCertificate(
        {
          dRepId: drepid,
        },
        rewardAddress,
      )
      .changeAddress(changeAddress)
      .selectUtxosFrom(utxos, "keepRelevant", "10000000");

    const unsignedTx = await txBuilder.complete();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    return txHash;
  }

  let codeSnippet = ``;
  codeSnippet += `const utxos = await wallet.getUtxos();\n`;
  codeSnippet += `const rewardAddresses = await wallet.getRewardAddresses();\n`;
  codeSnippet += `const rewardAddress = rewardAddresses[0];\n`;
  codeSnippet += `\n`;
  codeSnippet += `const changeAddress = await wallet.getChangeAddress();\n`;
  codeSnippet += `\n`;
  codeSnippet += txbuilderCode;
  codeSnippet += `txBuilder\n`;
  codeSnippet += `  .voteDelegationCertificate(\n`;
  codeSnippet += `    {\n`;
  codeSnippet += `      dRepId: '${drepid}',\n`;
  codeSnippet += `    },\n`;
  codeSnippet += `    rewardAddress,\n`;
  codeSnippet += `  )\n`;
  codeSnippet += `  .changeAddress(changeAddress)\n`;
  codeSnippet += `  .selectUtxosFrom(utxos, "keepRelevant", "10000000")\n`;
  codeSnippet += `\n`;
  codeSnippet += `const unsignedTx = await txBuilder.complete();\n`;
  codeSnippet += `const signedTx = await wallet.signTx(unsignedTx);\n`;
  codeSnippet += `const txHash = await wallet.submitTx(signedTx);\n`;

  return (
    <LiveCodeDemo
      title="DRep Vote Delegation"
      subtitle="Delegate your voting power to another DRep"
      code={codeSnippet}
      runCodeFunction={runDemo}
      disabled={!connected}
      runDemoButtonTooltip={
        !connected ? "Connect wallet to run this demo" : undefined
      }
      runDemoShowBrowseWalletConnect={true}
    >
      <InputTable
        listInputs={[
          <Input
            value={drepid}
            onChange={(e) => setDrepid(e.target.value)}
            placeholder="drep..."
            label="DRep ID"
            key={0}
          />,
        ]}
      />
    </LiveCodeDemo>
  );
}
