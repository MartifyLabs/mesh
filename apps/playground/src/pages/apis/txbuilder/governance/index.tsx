import type { NextPage } from "next";

import ButtonFloatDocumentation from "~/components/button/button-float-documentation";
import SidebarFullwidth from "~/components/layouts/sidebar-fullwidth";
import Link from "~/components/link";
import TitleIconDescriptionBody from "~/components/sections/title-icon-description-body";
import Metatags from "~/components/site/metatags";
import { metaTxbuilderGovernance } from "~/data/links-txbuilders";
import { Intro } from "../common";
import GovernanceDeregistration from "./deregistration";
import GovernanceRegistration from "./registration";
import GovernanceUpdate from "./update";
import GovernanceVote from "./vote";
import GovernanceVoteDelegation from "./vote-delegation";

const ReactPage: NextPage = () => {
  const sidebarItems = [
    { label: "Vote Delegation", to: "delegation" },
    { label: "DRep Registration", to: "registration" },
    { label: "DRep Update", to: "update" },
    { label: "DRep Retirement", to: "deregistration" },
    { label: "Vote", to: "vote" },
  ];

  return (
    <>
      <Metatags
        title={metaTxbuilderGovernance.title}
        description={metaTxbuilderGovernance.desc}
      />
      <SidebarFullwidth sidebarItems={sidebarItems}>
        <TitleIconDescriptionBody
          title={metaTxbuilderGovernance.title}
          description={metaTxbuilderGovernance.desc}
          heroicon={metaTxbuilderGovernance.icon}
        >
          <p>
            The implementation of {" "}
            <Link href="https://cips.cardano.org/cip/cip-1694">CIP-1694 | A 
            First Step Towards On-Chain Decentralized Governance</Link> within
            the Conway ledger era is Cardano's initial on-chain governance
            design. This system was allows the community to vote on how the
            chain is managed, such as how treasury funds are spent and changes
            to protocol parameters. This system is designed to be decentralized
            and transparent, allowing the community to decide the future of the
            network.
          </p>
          <Intro />
          <p>
            This page list the governance transactions that can be created using
            the Mesh SDK.
          </p>
        </TitleIconDescriptionBody>
        <ButtonFloatDocumentation href="https://docs.meshjs.dev/transactions/classes/MeshTxBuilder" />

        <GovernanceVoteDelegation />
        <GovernanceRegistration />
        <GovernanceUpdate />
        <GovernanceDeregistration />
        <GovernanceVote />
      </SidebarFullwidth>
    </>
  );
};

export default ReactPage;
