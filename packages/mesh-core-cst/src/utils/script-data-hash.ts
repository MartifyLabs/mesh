/* eslint-disable unicorn/number-literal-case */
import { Cardano, Serialization } from "@cardano-sdk/core";
import * as Crypto from "@cardano-sdk/crypto";
import { Hash32ByteBase16 } from "@cardano-sdk/crypto";
import { HexBlob } from "@cardano-sdk/util";

const CBOR_EMPTY_LIST = new Uint8Array([0x80]);
const CBOR_EMPTY_MAP = new Uint8Array([0xa0]);

/**
 * Encodes an array of CBOR-encodable objects into a CBOR format.
 *
 * Each object in the array is converted to its CBOR representation and then written into a
 * CBOR array.
 *
 * @param items An array of objects that can be encoded into CBOR.
 * @returns A `Uint8Array` containing the CBOR-encoded objects.
 */
const getCborEncodedArray = <T extends { toCbor: () => HexBlob }>(
  items: T[],
): Uint8Array => {
  const writer = new Serialization.CborWriter();

  writer.writeStartArray(items.length);

  for (const item of items) {
    writer.writeEncodedValue(Buffer.from(item.toCbor(), "hex"));
  }

  return writer.encode();
};

/**
 * Computes the hash of script data in a transaction, including redeemers, datums, and cost models.
 *
 * This function takes arrays of redeemers and datums, along with cost models, and encodes
 * them in a CBOR (Concise Binary Object Representation) format. The encoded data is then
 * hashed using the Blake2b hashing algorithm to produce a 32-byte hash. This hash is
 * representative of the script data in a transaction on the Cardano blockchain.
 *
 * @param costModels The cost models for script execution.
 * @param redemeers The redeemers in the transaction. If not present or empty, the function may return undefined.
 * @param datums The datums in the transaction.
 * @returns The hashed script data, or undefined if no redeemers are provided.
 */
export const hashScriptData = (
  costModels: Serialization.Costmdls,
  redemeers?: Serialization.Redeemer[],
  datums?: Serialization.PlutusData[],
): Crypto.Hash32ByteBase16 | undefined => {
  const writer = new Serialization.CborWriter();

  if (datums && datums.length > 0 && (!redemeers || redemeers.length === 0)) {
    /*
     ; Note that in the case that a transaction includes datums but does not
     ; include any redeemers, the script data format becomes (in hex):
     ; [ A0 | datums | A0 ]
     ; corresponding to a CBOR empty list and an empty map).
    */
    writer.writeEncodedValue(CBOR_EMPTY_MAP);
    writer.writeEncodedValue(getCborEncodedArray(datums));
    writer.writeEncodedValue(CBOR_EMPTY_MAP);
  } else {
    if (!redemeers || redemeers.length === 0) return undefined;
    /*
     ; script data format:
     ; [ redeemers | datums | language views ]
     ; The redeemers are exactly the data present in the transaction witness set.
     ; Similarly for the datums, if present. If no datums are provided, the middle
     ; field is an empty string.
    */
    writer.writeEncodedValue(getCborEncodedArray(redemeers));

    if (datums && datums.length > 0)
      writer.writeEncodedValue(getCborEncodedArray(datums));

    writer.writeEncodedValue(
      Buffer.from(costModels.languageViewsEncoding(), "hex"),
    );
  }

  return Hash32ByteBase16.fromHexBlob(
    HexBlob.fromBytes(
      Crypto.blake2b(Crypto.blake2b.BYTES).update(writer.encode()).digest(),
    ),
  );
};
