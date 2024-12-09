<div align="center">

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://meshjs.dev/logo-mesh/white/logo-mesh-white-512x512.png" width="200">
    <source media="(prefers-color-scheme: light)" srcset="https://meshjs.dev/logo-mesh/black/logo-mesh-black-512x512.png" width="200">
    <img alt="mesh logo" src="https://meshjs.dev/logo-mesh/mesh.png">
  </picture>

  <h1 style="border-bottom: none"><a href='https://meshjs.dev/'>Mesh</a> TypeScript SDK</h1>

  [![Licence](https://img.shields.io/github/license/meshjs/mesh)](https://github.com/meshjs/mesh/blob/master/LICENSE)
  [![Build](https://github.com/meshjs/mesh/actions/workflows/build.yml/badge.svg)](https://github.com/meshjs/mesh/actions/workflows/build.yml)
  [![Package](https://github.com/meshjs/mesh/actions/workflows/publish.yml/badge.svg)](https://github.com/meshjs/mesh/actions/workflows/publish.yml)

  [![Twitter/X](https://img.shields.io/badge/Follow%20us-@MeshJS-blue?logo=x&style=for-the-badge)](https://x.com/meshsdk)
  [![NPM](https://img.shields.io/npm/v/%40meshsdk%2Fcore?style=for-the-badge)](https://www.npmjs.com/package/@meshsdk/core)

  <strong>All-in-one TypeScript SDK for Cardano apps</strong>

</div>

<hr />

Mesh is an open-source library designed to make building dApps accessible. Whether you're a beginner developer, startup, web3 market leader, or a large enterprise, Mesh makes web3 development easy with reliable, scalable, and well-engineered APIs & developer tools.

Explore the features on [Mesh Playground](https://meshjs.dev/).

Instant setup a new project with a single command using Mesh CLI and start building:

```
npx meshjs your-app-name
```

## What's inside?

### Packages

A collection of packages that provide different functionalities to interact with the Cardano blockchain.

|  | Description | Docs | Playground |
| --- | --- | --- | --- |
| [@meshsdk/common](https://github.com/MeshJS/mesh/tree/main/packages/mesh-common) | Contains constants, types and interfaces used across the SDK and different serialization libraries | [:page_facing_up:](https://docs.meshjs.dev/common) |  |
| [@meshsdk/contract](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract) | A collection of smart contracts and its transactions | [:page_facing_up:](https://docs.meshjs.dev/contracts) | [:shipit:](https://meshjs.dev/smart-contracts) |
| [@meshsdk/core](https://github.com/MeshJS/mesh/tree/main/packages/mesh-core) | Exports all the functionalities including wallets, transactions, and providers |  | [:shipit:](https://meshjs.dev/) |
| [@meshsdk/core-csl](https://github.com/MeshJS/mesh/tree/main/packages/mesh-core-csl) | Types and utilities functions between Mesh and cardano-serialization-lib | [:page_facing_up:](https://docs.meshjs.dev/core-csl) |  |
| [@meshsdk/core-cst](https://github.com/MeshJS/mesh/tree/main/packages/mesh-core-cst) | Types and utilities functions between Mesh and cardano-js-sdk | [:page_facing_up:](https://docs.meshjs.dev/core-cst) |  |
| [@meshsdk/provider](https://github.com/MeshJS/mesh/tree/main/packages/mesh-provider) | Blockchain data providers | [:page_facing_up:](https://docs.meshjs.dev/providers) | [:shipit:](https://meshjs.dev/providers) |
| [@meshsdk/react](https://github.com/MeshJS/mesh/tree/main/packages/mesh-react) | React component library |  | [:shipit:](https://meshjs.dev/react) |
| [@meshsdk/transaction](https://github.com/MeshJS/mesh/tree/main/packages/mesh-transaction) | Transactions to send assets, mint tokens, and interact with smart contracts | [:page_facing_up:](https://docs.meshjs.dev/transactions) | [:shipit:](https://meshjs.dev/apis/transaction) |
| [@meshsdk/wallet](https://github.com/MeshJS/mesh/tree/main/packages/mesh-wallet) | Wallets to manage assets and interact with the blockchain | [:page_facing_up:](https://docs.meshjs.dev/wallets) | [:shipit:](https://meshjs.dev/apis/wallets) |

### Apps

Frontend documentation and live demos for Mesh SDK.

|  | Description | Website |
| --- | --- | --- |
| [apps/docs](https://github.com/MeshJS/mesh/tree/main/apps/docs) | Mesh technical docs | [:shipit:](https://docs.meshjs.dev/) |
| [apps/playground](https://github.com/MeshJS/mesh/tree/main/apps/playground) | Mesh homepage and live demos | [:shipit:](https://meshjs.dev/) |

### Mesh Smart Contracts Library

Here's a list of open-source smart contracts, complete with documentation, live demos, and end-to-end source code.

| Contract | Description | Links |
| --- | --- | --- |
| Content Ownership | Create a content registry and users can create content that is stored in the registry | [[demo](https://meshjs.dev/smart-contracts/content-ownership)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/content-ownership)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshContentOwnershipContract)] |
| Escrow | Facilitates the secure exchange of assets between two parties by acting as a trusted intermediary that holds the assets until the conditions of the agreement are met | [[demo](https://meshjs.dev/smart-contracts/escrow)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/escrow)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshEscrowContract)] |
| Giftcard | Allows users to create a transactions to lock assets into the smart contract, which can be redeemed by any user | [[demo](https://meshjs.dev/smart-contracts/giftcard)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/giftcard)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshGiftcardContract)] |
| Hello World | A simple lock-and-unlock assets contract, providing a hands-on introduction to end-to-end smart contract validation and transaction building | [[demo](https://meshjs.dev/smart-contracts/hello-world)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/hello-world)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshHelloWorldContract)] |
| Marketplace | Allows anyone to buy and sell native assets such as NFTs | [[demo](https://meshjs.dev/smart-contracts/marketplace)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/marketplace)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshMarketplaceContract)] |
| NFT Minting Machine | Mint NFTs with an automatically incremented index, which increases by one for each newly minted NFT | [[demo](https://meshjs.dev/smart-contracts/plutus-nft)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/plutus-nft)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshPlutusNFTContract)] |
| Payment Splitter | Allows users to split incoming payments among a group of accounts | [[demo](https://meshjs.dev/smart-contracts/payment-splitter)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/payment-splitter)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshPaymentSplitterContract)] |
| Swap | Facilitates the exchange of assets between two parties | [[demo](https://meshjs.dev/smart-contracts/swap)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/swap)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshSwapContract)] |
| Vesting | Allows users to lock tokens for a period of time and withdraw the funds after the lockup period | [[demo](https://meshjs.dev/smart-contracts/vesting)] [[source](https://github.com/MeshJS/mesh/tree/main/packages/mesh-contract/src/vesting)] [[docs](https://docs.meshjs.dev/contracts/classes/MeshVestingContract)] |

## Usage

### Install

To install all dependencies, run the following command:

```
npm install
```

### Build

To build all apps and packages, run the following command:

```
npm run build
```

### Run

To run all apps and packages, run the following command:

```
npm run dev
```

## Contributing

Mesh SDK project welcomes all constructive contributions. Contributions take many forms, from code for bug fixes and enhancements, to additions and fixes to documentation, additional tests, triaging incoming pull requests and issues, and more!

Check out the [contributing guide](https://github.com/MeshJS/mesh/blob/main/CONTRIBUTING.md).

![Alt](https://repobeats.axiom.co/api/embed/a55b792080ada8db32fb84c10addc7b4afab7679.svg "Repobeats analytics image")
