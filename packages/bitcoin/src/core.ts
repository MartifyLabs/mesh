import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";
import * as bip39 from "bip39";
import { BIP32Factory } from "bip32";
import { ECPairFactory } from "ecpair";

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

bitcoin.initEccLib(ecc);

export { bitcoin, ECPair, bip32, bip39 };
