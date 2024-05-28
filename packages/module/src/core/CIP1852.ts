import { HARDENED_KEY_START } from '../common/constants.js';
import { deserializeBip32PrivateKey } from '../common/utils/index.js';

export const deriveAccountKeys = (rootKey: string, accountIndex: number) => {
  const bip32PrivateKey = deserializeBip32PrivateKey(rootKey);

  const accountKeys = bip32PrivateKey
    .derive(HARDENED_KEY_START + 1852) // purpose
    .derive(HARDENED_KEY_START + 1815) // coin type
    .derive(HARDENED_KEY_START + accountIndex);

  const paymentKey = accountKeys
    .derive(0) // external chain
    .derive(0)
    .to_raw_key();

  const stakeKey = accountKeys
    .derive(2) // staking key
    .derive(0)
    .to_raw_key();

  accountKeys.free();
  bip32PrivateKey.free();

  return { paymentKey, stakeKey };
};
