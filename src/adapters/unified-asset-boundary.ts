import type {
  InvoiceBoundaryInput,
  PaymentIntent,
  PaymentIntentBoundaryInput,
  PaymentInvoice,
  PaymentPayout,
  PayoutBoundaryInput
} from '../types/payment-intent.js';
import type { UnifiedAssetBoundaryInput, UnifiedAssetReference } from '../types/unified-asset.js';

function normalizeString(name: string, value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return normalized;
}

function normalizeDecimals(name: string, value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function ensureConsistentString(name: string, canonical: string | undefined, legacy: string | undefined): string {
  if (canonical === undefined && legacy === undefined) {
    throw new Error(`${name} is required`);
  }
  if (canonical !== undefined && legacy !== undefined && canonical !== legacy) {
    throw new Error(`inconsistent ${name}: canonical=${canonical} legacy=${legacy}`);
  }
  return canonical ?? legacy!;
}

function ensureConsistentDecimals(canonical: number | undefined, legacy: number | undefined): number {
  if (canonical === undefined && legacy === undefined) {
    throw new Error('decimals is required');
  }
  if (canonical !== undefined && legacy !== undefined && canonical !== legacy) {
    throw new Error(`inconsistent decimals: canonical=${canonical} legacy=${legacy}`);
  }
  return canonical ?? legacy!;
}

export function resolveUnifiedAssetReference(input: UnifiedAssetBoundaryInput): UnifiedAssetReference {
  const canonicalChain = normalizeString('asset.chain', input.asset?.chain);
  const legacyChain =
    normalizeString('chain', input.chain) ??
    normalizeString('chainId', input.chainId) ??
    normalizeString('chain_id', input.chain_id);

  const canonicalAsset = normalizeString('asset.asset', input.asset?.asset);
  const legacyAsset =
    normalizeString('assetId', input.assetId) ?? normalizeString('asset_id', input.asset_id);

  const canonicalDecimals = normalizeDecimals('asset.decimals', input.asset?.decimals);
  const legacyDecimals =
    normalizeDecimals('decimals', input.decimals) ??
    normalizeDecimals('assetDecimals', input.assetDecimals) ??
    normalizeDecimals('asset_decimals', input.asset_decimals);

  return {
    chain: ensureConsistentString('chain', canonicalChain, legacyChain),
    asset: ensureConsistentString('asset', canonicalAsset, legacyAsset),
    decimals: ensureConsistentDecimals(canonicalDecimals, legacyDecimals)
  };
}

export function adoptPaymentIntentBoundary(input: PaymentIntentBoundaryInput): PaymentIntent {
  const { asset: _asset, chain, chainId, chain_id, assetId, asset_id, decimals, assetDecimals, asset_decimals, ...rest } = input;
  const canonicalAsset = resolveUnifiedAssetReference(input);
  return {
    ...rest,
    asset: canonicalAsset,
    assetId: canonicalAsset.asset
  };
}

export function adoptInvoiceBoundary(input: InvoiceBoundaryInput): PaymentInvoice {
  const { asset: _asset, chain, chainId, chain_id, assetId, asset_id, decimals, assetDecimals, asset_decimals, ...rest } = input;
  const canonicalAsset = resolveUnifiedAssetReference(input);
  return {
    ...rest,
    asset: canonicalAsset,
    assetId: canonicalAsset.asset
  };
}

export function adoptPayoutBoundary(input: PayoutBoundaryInput): PaymentPayout {
  const { asset: _asset, chain, chainId, chain_id, assetId, asset_id, decimals, assetDecimals, asset_decimals, ...rest } = input;
  const canonicalAsset = resolveUnifiedAssetReference(input);
  return {
    ...rest,
    asset: canonicalAsset,
    assetId: canonicalAsset.asset
  };
}
