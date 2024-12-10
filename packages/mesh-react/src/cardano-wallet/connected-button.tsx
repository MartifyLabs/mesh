import { useEffect, useState } from "react";

import { Button } from "../common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../common/dropdown-menu";
import { useWallet } from "../hooks";

export default function ConnectedButton() {
  const { wallet, connected, disconnect } = useWallet();
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (connected && wallet) {
      async function afterConnectedWallet() {
        let address = (await wallet.getUnusedAddresses())[0];
        if (!address) address = await wallet.getChangeAddress();
        setAddress(address);
      }
      afterConnectedWallet();
    }
  }, [connected, wallet]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="mesh-text-white">
          {address.slice(0, 6)}...{address.slice(-6)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator /> */}
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address);
          }}
        >
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            disconnect();
          }}
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
