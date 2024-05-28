import {
  AlgorithmId,
  BigNum,
  COSESign1Builder,
  COSESign1,
  CBORValue,
  COSEKey,
  HeaderMap,
  Headers,
  Int,
  KeyType,
  Label,
  ProtectedHeaderMap,
} from '@emurgo/cardano-message-signing-nodejs';
import {
  deserializeAddress,
  deserializeEd25519Signature,
  deserializePublicKey,
  fromBytes,
  fromUTF8,
  resolveStakeKeyHash,
  toBytes,
} from '../common/utils/index.js';
import type { DataSignature } from '../common/types/index.js';
import type { Address, PrivateKey, PublicKey } from '../core/index.js';

export const signMessage = (
  message: Message,
  signer: Signer
): { coseKey: string; coseSign1: string } => {
  const coseKey = createCOSEKey(signer);
  const coseSign1 = createCOSESign1(message, signer);

  return {
    coseKey: fromBytes(coseKey.to_bytes()),
    coseSign1: fromBytes(coseSign1.to_bytes()),
  };
};

export const checkSignature = (
  message: string,
  signer: string,
  { key, signature }: DataSignature
) => {
  const coseKey = COSEKey.from_bytes(toBytes(key));
  const coseSign1 = COSESign1.from_bytes(toBytes(signature));

  if (message?.length > 0) {
    const payload = fromBytes(coseSign1.payload() ?? new Uint8Array());
    if (fromUTF8(message) !== payload) return false;
  }

  if (signer?.length > 0) {
    const protectedHeaders = coseSign1
      .headers()
      .protected()
      .deserialized_headers();

    const signerAddress = protectedHeaders
      .header(Label.new_text('address'))
      ?.as_bytes();

    if (signerAddress === undefined) {
      throw new Error("Couldn't find a signer address in signature");
    }

    const signerKey = coseKey
      .header(Label.new_int(Int.new_negative(BigNum.from_str('2'))))
      ?.as_bytes();

    if (signerKey === undefined) {
      throw new Error("Couldn't find a signer key in signature");
    }

    const address = deserializeAddress(fromBytes(signerAddress));
    const publicKey = deserializePublicKey(fromBytes(signerKey));

    if (checkAddress(signer, address, publicKey) === false) {
      throw new Error("Couldn't check signature because of address mismatch");
    }

    const ed25519Signature = deserializeEd25519Signature(
      fromBytes(coseSign1.signature())
    );

    const data = coseSign1.signed_data().to_bytes();
    return publicKey.verify(data, ed25519Signature);
  }

  return false;
};

const checkAddress = (
  signer: string,
  address: Address,
  publicKey: PublicKey
) => {
  if (signer !== address.to_bech32()) return false;

  try {
    const keyHash = resolveStakeKeyHash(signer);
    return keyHash === publicKey.hash().to_hex();
  } catch (error) {
    return false;
  }
};

const createCOSEKey = (signer: Signer) => {
  const coseKey = COSEKey.new(Label.from_key_type(KeyType.OKP));

  coseKey.set_algorithm_id(Label.from_algorithm_id(AlgorithmId.EdDSA));

  coseKey.set_header(
    Label.new_int(Int.new_negative(BigNum.from_str('1'))),
    CBORValue.new_int(Int.new_i32(6))
  );

  coseKey.set_header(
    Label.new_int(Int.new_negative(BigNum.from_str('2'))),
    CBORValue.new_bytes(signer.key.to_public().as_bytes())
  );

  return coseKey;
};

const createCOSESign1 = (message: Message, signer: Signer) => {
  const protectedHeaders = HeaderMap.new();
  const unprotectedHeaders = HeaderMap.new();

  protectedHeaders.set_algorithm_id(Label.from_algorithm_id(AlgorithmId.EdDSA));

  protectedHeaders.set_header(
    Label.new_text('address'),
    CBORValue.new_bytes(signer.address.to_bytes())
  );

  const headers = Headers.new(
    ProtectedHeaderMap.new(protectedHeaders),
    unprotectedHeaders
  );

  const coseSign1Builder = COSESign1Builder.new(
    headers,
    toBytes(message.payload),
    false
  );

  if (message.externalAAD !== undefined) {
    coseSign1Builder.set_external_aad(toBytes(message.externalAAD));
  }

  const dataToSign = coseSign1Builder.make_data_to_sign();
  const signedSigStructure = signer.key.sign(dataToSign.to_bytes());

  return coseSign1Builder.build(signedSigStructure.to_bytes());
};

export type Message = {
  payload: string;
  externalAAD?: string;
};

export type Signer = {
  address: Address;
  key: PrivateKey;
};
