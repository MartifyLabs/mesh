import { useEffect, useState } from 'react';
import Codeblock from '../../../../ui/codeblock';
import Card from '../../../../ui/card';
import RunDemoButton from '../../../../common/runDemoButton';
import RunDemoResult from '../../../../common/runDemoResult';
import SectionTwoCol from '../../../../common/sectionTwoCol';
import { useWallet } from '@meshsdk/react';
import ConnectCipWallet from '../../../../common/connectCipWallet';
import Input from '../../../../ui/input';
import Button from '../../../../ui/button';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import {
  demoAddresses,
  demoPlutusMintingScript,
} from '../../../../../configs/demo';
import { Transaction } from '@meshsdk/core';
import { Mint, Action, PlutusScript, AssetMetadata } from '@meshsdk/common';
import Textarea from '../../../../ui/textarea';
import Link from 'next/link';

const defaultMetadata = {
  name: 'Mesh Token',
  image: 'ipfs://QmRzicpReutwCkM6aotuKjErFCUD213DpwPq6ByuzMJaua',
  mediaType: 'image/jpg',
  description: 'This NFT was minted by Mesh (https://meshjs.dev/).',
};

export default function PlutusMinting() {
  const { wallet, connected } = useWallet();

  const [userInput, setUserInput] = useState<{}[]>([
    {
      address: demoAddresses.testnet,
      assetName: 'MeshToken',
      metadata: JSON.stringify(defaultMetadata, null, 2),
      assetLabel: '721',
      quantity: 1,
    },
  ]);

  async function updateField(action, index, field, value) {
    let _address = demoAddresses.testnet;
    if (connected) {
      _address =
        (await wallet.getNetworkId()) === 1
          ? demoAddresses.mainnet
          : demoAddresses.testnet;
    }

    let updated = [...userInput];
    if (action == 'add') {
      updated.push({
        address: _address,
        assetName: 'MeshToken',
        metadata: JSON.stringify(defaultMetadata, null, 2),
        assetLabel: '721',
        quantity: 1,
      });
    } else if (action == 'update') {
      if (
        field == 'metadata' ||
        field == 'assetName' ||
        field == 'address' ||
        field == 'assetLabel' ||
        field == 'quantity'
      ) {
        updated[index][field] = value;
      }
    } else if (action == 'remove') {
      updated.splice(index, 1);
    }
    setUserInput(updated);
  }

  useEffect(() => {
    async function init() {
      const usedAddress = await wallet.getUsedAddresses();
      const address = usedAddress[0];
      let updated = [
        {
          address: address,
          assetName: 'MeshToken',
          metadata: JSON.stringify(defaultMetadata, null, 2),
          assetLabel: '721',
          quantity: 1,
        },
      ];
      setUserInput(updated);
    }
    if (connected) {
      init();
    }
  }, [connected]);

  return (
    <SectionTwoCol
      sidebarTo="plutusminting"
      header="Minting Assets with Smart Contract"
      leftFn={Left({ userInput })}
      rightFn={Right({ userInput, updateField })}
    />
  );
}

function Left({ userInput }) {
  let codeSnippet = `import { Transaction } from '@meshsdk/core';\n`;
  codeSnippet += `import { AssetMetadata, Mint, Action, PlutusScript } from '@meshsdk/core';\n\n`;

  codeSnippet += `const script: PlutusScript = {\n`;
  codeSnippet += `  code: plutusMintingScriptCbor,\n`;
  codeSnippet += `  version: 'V2',\n`;
  codeSnippet += `};\n\n`;
  codeSnippet += `const redeemer: Partial<Action> = {\n`;
  codeSnippet += `  tag: 'MINT',\n`;
  codeSnippet += `};\n\n`;

  codeSnippet += `const tx = new Transaction({ initiator: wallet });\n\n`;

  let counter = 1;
  for (const recipient of userInput) {
    let _metadata = JSON.stringify(
      { error: 'Not a valid javascript object' },
      null,
      2
    );
    try {
      _metadata = JSON.stringify(JSON.parse(recipient.metadata), null, 2);
    } catch (error) {}
    codeSnippet += `// define asset#${counter} metadata\n`;
    codeSnippet += `const assetMetadata${counter}: AssetMetadata = ${_metadata};\n`;
    codeSnippet += `const asset${counter}: Mint = {\n`;
    codeSnippet += `  assetName: '${recipient.assetName}',\n`;
    codeSnippet += `  assetQuantity: '${recipient.quantity}',\n`;
    codeSnippet += `  metadata: assetMetadata${counter},\n`;
    codeSnippet += `  label: '${recipient.assetLabel}',\n`;
    codeSnippet += `  recipient: '${recipient.address}',\n`;
    codeSnippet += `};\n`;
    codeSnippet += `tx.mintAsset(\n`;
    codeSnippet += `  script,\n`;
    codeSnippet += `  asset${counter},\n`;
    codeSnippet += `  redeemer,\n`;
    codeSnippet += `);\n\n`;
    counter++;
  }

  codeSnippet += `const unsignedTx = await tx.build();\n`;
  codeSnippet += `const signedTx = await wallet.signTx(unsignedTx);\n`;
  codeSnippet += `const txHash = await wallet.submitTx(signedTx);`;

  let codeSnippetScript = `import { Action, PlutusScript } from '@meshsdk/core';\n\n`;
  codeSnippetScript += `const script: PlutusScript = {\n`;
  codeSnippetScript += `  code: plutusMintingScriptCbor,\n`;
  codeSnippetScript += `  version: 'V2',\n`;
  codeSnippetScript += `};\n\n`;
  codeSnippetScript += `const redeemer: Partial<Action> = {\n`;
  codeSnippetScript += `  tag: 'MINT',\n`;
  codeSnippetScript += `};\n`;

  let codeSnippetTx = `import { AssetMetadata, Mint } from '@meshsdk/core';\n\n`;
  codeSnippetTx += `const assetMetadata1: AssetMetadata = {\n`;
  codeSnippetTx += `  "name": "Mesh Token",\n`;
  codeSnippetTx += `  ...\n`;
  codeSnippetTx += `}\n\n`;
  codeSnippetTx += `const asset: Mint = {\n`;
  codeSnippetTx += `  assetName: 'MeshToken',\n`;
  codeSnippetTx += `  ...\n`;
  codeSnippetTx += `}\n\n`;
  codeSnippetTx += `tx.mintAsset(script, asset, redeemer);\n`;

  return (
    <>
      <p>
        In this demo, we will use a Plutus script to mint tokens. This script is
        designed to always succeed, meaning that anyone can sign and mint tokens
        with it, as there is no extra validation logic carried out by this
        script.
      </p>

      <p>
        Firstly, we create a new <code>PlutusScript</code> and "redeemer" (
        <code>Action</code>):
      </p>

      <Codeblock data={codeSnippetScript} isJson={false} />

      <p>
        You can get the 'always succeed' Plutus script CBOR (to replace{' '}
        <code>plutusMintingScriptCbor</code>) from this{' '}
        <a
          href="https://gist.github.com/jinglescode/23d173ea382a0d3589cdf5170c0aca60"
          target="_blank"
          rel="noreferrer"
        >
          gist
        </a>
        .
      </p>

      <p>
        Next, we{' '}
        <Link href="/apis/transaction/smart-contract#plutusminting">
          define the asset and its metadata
        </Link>
        , and add the <code>script</code> (<code>PlutusScript</code>),{' '}
        <code>redeemer</code> (<code>Action</code>), and the
        <code>asset</code> (<code>Mint</code>) to the transaction:
      </p>
      <Codeblock data={codeSnippetTx} isJson={false} />

      <p>Here is the full code:</p>
      <Codeblock data={codeSnippet} isJson={false} />
    </>
  );
}

function Right({ userInput, updateField }) {
  const [state, setState] = useState<number>(0);
  const [response, setResponse] = useState<null | any>(null);
  const [responseError, setResponseError] = useState<null | any>(null);
  const { wallet, connected } = useWallet();

  async function runDemo() {
    setState(1);
    setResponse(null);
    setResponseError(null);

    try {
      const script: PlutusScript = {
        code: demoPlutusMintingScript,
        version: 'V2',
      };
      const redeemer: Partial<Action> = {
        tag: 'MINT',
      };

      const tx = new Transaction({ initiator: wallet });

      for (const recipient of userInput) {
        let assetMetadata: undefined | AssetMetadata = undefined;
        try {
          assetMetadata = JSON.parse(recipient.metadata);
        } catch (error) {
          setResponseError(
            'Problem parsing metadata. Must be a valid JavaScript object.'
          );
          setState(0);
        }
        if (assetMetadata == undefined) {
          return;
        }

        const asset: Mint = {
          assetName: recipient.assetName,
          assetQuantity: recipient.quantity.toString(),
          metadata: assetMetadata,
          label: recipient.assetLabel,
          recipient: recipient.address,
        };
        tx.mintAsset(script, asset, redeemer);
      }

      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);
      setResponse(txHash);
      setState(2);
    } catch (error) {
      setResponseError(JSON.stringify(error));
      setState(0);
    }
  }

  return (
    <Card>
      <InputTable userInput={userInput} updateField={updateField} />

      {connected ? (
        <>
          <RunDemoButton
            runDemoFn={runDemo}
            loading={state == 1}
            response={response}
          />
          <RunDemoResult response={response} />
        </>
      ) : (
        <ConnectCipWallet />
      )}
      <RunDemoResult response={responseError} label="Error" />
    </Card>
  );
}

function InputTable({ userInput, updateField }) {
  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 m-0">
        <caption className="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
          Mint assets and send to recipients
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Add or remove recipients, input the address and define the asset
            metadata before minting and sending.
          </p>
        </caption>
        <thead className="thead">
          <tr>
            <th scope="col" className="py-3">
              Recipients
            </th>
          </tr>
        </thead>
        <tbody>
          {userInput.map((row, i) => {
            return (
              <tr
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                key={i}
              >
                <td>
                  <div className="flex">
                    <div className="flex-1 items-center pt-2">
                      <span className="">Recipient #{i + 1}</span>
                    </div>
                    <div className="flex-none">
                      <Button
                        onClick={() => updateField('remove', i)}
                        style="error"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={row.address}
                    onChange={(e) =>
                      updateField('update', i, 'address', e.target.value)
                    }
                    placeholder="Address"
                    label="Address"
                  />
                  <Input
                    value={row.assetName}
                    onChange={(e) =>
                      updateField('update', i, 'assetName', e.target.value)
                    }
                    placeholder="Asset name"
                    label="Asset name"
                  />
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Metadata
                  </label>
                  <Textarea
                    value={row.metadata}
                    onChange={(e) =>
                      updateField('update', i, 'metadata', e.target.value)
                    }
                    rows={8}
                  />
                  <div className="block mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Asset label
                    </label>
                    <div className="flex items-center mb-4">
                      <input
                        type="radio"
                        value="721"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        checked={row.assetLabel === '721'}
                        onChange={(e) =>
                          updateField('update', i, 'assetLabel', '721')
                        }
                      />
                      <label
                        htmlFor="assetlabel-radio-1"
                        className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >
                        Non fungible asset (721)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        value="20"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        checked={row.assetLabel === '20'}
                        onChange={(e) =>
                          updateField('update', i, 'assetLabel', '20')
                        }
                      />
                      <label
                        htmlFor="assetlabel-radio-2"
                        className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >
                        Fungible asset (20)
                      </label>
                    </div>
                  </div>
                  <Input
                    value={row.quantity}
                    type="number"
                    onChange={(e) =>
                      updateField('update', i, 'quantity', e.target.value)
                    }
                    placeholder="Quantity"
                    label="Quantity"
                  />
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={3}>
              <Button onClick={() => updateField('add')}>
                <PlusCircleIcon className="m-0 mr-2 w-4 h-4" />
                Add recipient
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
