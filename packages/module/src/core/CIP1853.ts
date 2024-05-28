import { HARDENED_KEY_START } from '../common/constants.js';
import { deserializeBip32PrivateKey } from '../common/utils/index.js';

export const deriveStakePoolColdKey = (rootKey: string, coldIndex: number) => {
  const bip32PrivateKey = deserializeBip32PrivateKey(rootKey);

  const coldKey = bip32PrivateKey
    .derive(HARDENED_KEY_START + 1853) // purpose
    .derive(HARDENED_KEY_START + 1815) // coin type
    .derive(HARDENED_KEY_START + 0) // usecase
    .derive(HARDENED_KEY_START + coldIndex)
    .to_raw_key();

  bip32PrivateKey.free();

  return coldKey;
};
