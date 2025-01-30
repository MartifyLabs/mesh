export type Address = {
  address: string;
  publicKey: string;
  purpose: "payment" | "ordinals" | "stacks";
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "stacks";
}