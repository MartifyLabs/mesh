import type { NextPage } from "next";

import SidebarFullwidth from "~/components/layouts/sidebar-fullwidth";
import TitleIconDescriptionBody from "~/components/sections/title-icon-description-body";
import Metatags from "~/components/site/metatags";
import { metaSvelteGettingstarted } from "~/data/links-svelte";
import SvelteConnectWallet from "../ui-components/connect-wallet";
import SvelteSetup from "./setup";
import SvelteState from "./state";

const SveltePage: NextPage = () => {
  const sidebarItems = [
    { label: "Setup", to: "SvelteSetup" },
    { label: "Connect Wallet", to: "connectWallet" },
    { label: "Get Wallet State", to: "svelteState" },
  ];

  return (
    <>
      <Metatags
        title={metaSvelteGettingstarted.title}
        description={metaSvelteGettingstarted.desc}
      />
      <SidebarFullwidth sidebarItems={sidebarItems}>
        <TitleIconDescriptionBody
          title={metaSvelteGettingstarted.title}
          description={metaSvelteGettingstarted.desc}
          heroicon={metaSvelteGettingstarted.icon}
        >
          <p>
            Mesh provide a collection of useful UI components, so you can easily
            include web3 functionality and convenient utilities for your
            application.
          </p>
        </TitleIconDescriptionBody>

        <SvelteSetup />
        <SvelteConnectWallet />
        <SvelteState />
      </SidebarFullwidth>
    </>
  );
};

export default SveltePage;
