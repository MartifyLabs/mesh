import type {
  MetadataStandard,
  Files,
  RoyaltiesStandard,
} from '../../core/index.js';

export type AssetMetadata =
  | FungibleAssetMetadata
  | NonFungibleAssetMetadata
  | RoyaltiesStandard;

export type FungibleAssetMetadata = MetadataStandard & {
  ticker: string;
  decimals: number;
  version: `${number}.${number}`;
};

export type NonFungibleAssetMetadata =
  | AudioAssetMetadata
  | ImageAssetMetadata
  | SmartAssetMetadata
  | VideoAssetMetadata;

type AudioAssetMetadata = MetadataStandard & Files;

export type ImageAssetMetadata = MetadataStandard &
  Files & {
    artists?: [
      {
        name: string;
        twitter?: `https://twitter.com/${string}`;
      }
    ];
    attributes?: {
      [key: string]: string;
    };
    traits?: string[];
  };

type SmartAssetMetadata = MetadataStandard & Files;

type VideoAssetMetadata = MetadataStandard & Files;
