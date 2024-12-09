import type { NextPage } from "next";

import SidebarFullwidth from "~/components/layouts/sidebar-fullwidth";
import TitleIconDescriptionBody from "~/components/sections/title-icon-description-body";
import Metatags from "~/components/site/metatags";
import { metaReactGettingstarted } from "~/data/links-react";
import ReactConnectWallet from "../ui-components/connect-wallet";
import ReactHookUseWallet from "../wallet-hooks/use-wallet";
import ReactSetup from "./setup";
import MeshProvider from "./mesh-provider";

const ReactPage: NextPage = () => {
  const sidebarItems = [
    { label: "Setup", to: "reactSetup" },
    { label: "Mesh Provider", to: "meshProvider" },
    { label: "Connect Wallet", to: "connectWallet" },
    { label: "useWallet Hook", to: "useWallet" },
  ];

  return (
    <>
      <Metatags
        title={metaReactGettingstarted.title}
        description={metaReactGettingstarted.desc}
      />
      <SidebarFullwidth sidebarItems={sidebarItems}>
        <TitleIconDescriptionBody
          title={metaReactGettingstarted.title}
          description={metaReactGettingstarted.desc}
          heroicon={metaReactGettingstarted.icon}
        >
          <p>
            Mesh provide a collection of useful UI components, so you can easily
            include web3 functionality and convenient utilities for your
            application.
          </p>
        </TitleIconDescriptionBody>

        <ReactSetup />
        <MeshProvider />
        <ReactConnectWallet />
        <ReactHookUseWallet />
      </SidebarFullwidth>
    </>
  );
};

export default ReactPage;
