export interface UnifiedAssetReference {
  chain: string;
  asset: string;
  decimals: number;
}

export interface UnifiedAssetBoundaryInput {
  asset?: Partial<UnifiedAssetReference>;
  chain?: string;
  chainId?: string;
  chain_id?: string;
  assetId?: string;
  asset_id?: string;
  decimals?: number;
  assetDecimals?: number;
  asset_decimals?: number;
}
