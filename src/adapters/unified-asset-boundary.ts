import type {
  AccountAbstractionBoundaryInput,
  InvoiceBoundaryInput,
  PaymentExecution,
  PaymentExecutionMode,
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

function normalizeLowerString(name: string, value: string | undefined): string | undefined {
  const normalized = normalizeString(name, value);
  return normalized?.toLowerCase();
}

function normalizeDecimals(name: string, value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0 || value > 38) {
    throw new Error(`${name} must be an integer between 0 and 38`);
  }
  return value;
}

function ensurePattern(name: string, value: string, pattern: RegExp, hint: string): string {
  if (!pattern.test(value)) {
    throw new Error(`${name} ${hint}`);
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

function normalizeExecutionMode(value: string | undefined): PaymentExecutionMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'legacy' || value === 'erc4337') {
    return value;
  }
  throw new Error('execution mode must be legacy or erc4337');
}

function hasAnyAccountAbstractionFields(input: AccountAbstractionBoundaryInput): boolean {
  return (
    input.smart_account_id !== undefined ||
    input.smartAccountId !== undefined ||
    input.entry_point !== undefined ||
    input.entryPoint !== undefined ||
    input.sponsorship_mode !== undefined ||
    input.sponsorshipMode !== undefined ||
    input.sponsor_account_id !== undefined ||
    input.sponsorAccountId !== undefined ||
    input.sponsor_chain !== undefined ||
    input.sponsorChain !== undefined ||
    input.sponsor_asset !== undefined ||
    input.sponsorAsset !== undefined ||
    input.allow_legacy_fallback !== undefined ||
    input.allowLegacyFallback !== undefined ||
    input.execution !== undefined
  );
}

function hasAnyAccountAbstractionConfigOutsideMode(input: AccountAbstractionBoundaryInput): boolean {
  return (
    input.smart_account_id !== undefined ||
    input.smartAccountId !== undefined ||
    input.entry_point !== undefined ||
    input.entryPoint !== undefined ||
    input.sponsorship_mode !== undefined ||
    input.sponsorshipMode !== undefined ||
    input.sponsor_account_id !== undefined ||
    input.sponsorAccountId !== undefined ||
    input.sponsor_chain !== undefined ||
    input.sponsorChain !== undefined ||
    input.sponsor_asset !== undefined ||
    input.sponsorAsset !== undefined ||
    input.allow_legacy_fallback !== undefined ||
    input.allowLegacyFallback !== undefined ||
    input.execution?.smart_account_id !== undefined ||
    input.execution?.entry_point !== undefined ||
    input.execution?.sponsorship_mode !== undefined ||
    input.execution?.sponsor_account_id !== undefined ||
    input.execution?.sponsor_chain !== undefined ||
    input.execution?.sponsor_asset !== undefined ||
    input.execution?.allow_legacy_fallback !== undefined
  );
}

function resolveExecutionBoundary(
  input: AccountAbstractionBoundaryInput,
  sourceAccountId: string,
  asset: UnifiedAssetReference
): PaymentExecution | undefined {
  const mode = normalizeExecutionMode(
    input.execution?.mode ?? input.execution_mode ?? input.executionMode
  );
  const inferredMode: PaymentExecutionMode | undefined =
    mode ?? (hasAnyAccountAbstractionFields(input) ? 'erc4337' : undefined);

  if (inferredMode === undefined) {
    return undefined;
  }

  if (inferredMode === 'legacy') {
    if (hasAnyAccountAbstractionConfigOutsideMode(input)) {
      throw new Error('AA execution fields are not allowed when execution mode is legacy');
    }
    return { mode: 'legacy' };
  }

  const smartAccountId = normalizeString(
    'smart_account_id',
    input.execution?.smart_account_id ?? input.smart_account_id ?? input.smartAccountId
  );
  const entryPoint = normalizeLowerString(
    'entry_point',
    input.execution?.entry_point ?? input.entry_point ?? input.entryPoint
  );
  if (smartAccountId === undefined) {
    throw new Error('smart_account_id is required for erc4337 execution');
  }
  if (entryPoint === undefined) {
    throw new Error('entry_point is required for erc4337 execution');
  }
  ensurePattern(
    'entry_point',
    entryPoint,
    /^0x[a-f0-9]{4,}$/,
    'must be a hex-prefixed address-like value'
  );
  ensurePattern(
    'smart_account_id',
    smartAccountId,
    /^[a-zA-Z0-9:_-]{3,128}$/,
    'must be 3-128 chars of [a-zA-Z0-9:_-]'
  );

  const sponsorshipMode = normalizeString(
    'sponsorship_mode',
    input.execution?.sponsorship_mode ?? input.sponsorship_mode ?? input.sponsorshipMode
  ) as PaymentExecution['sponsorship_mode'] | undefined;
  if (sponsorshipMode !== undefined && sponsorshipMode !== 'none' && sponsorshipMode !== 'paymaster') {
    throw new Error('sponsorship_mode must be none or paymaster');
  }

  const sponsorAccountId = normalizeString(
    'sponsor_account_id',
    input.execution?.sponsor_account_id ?? input.sponsor_account_id ?? input.sponsorAccountId
  );
  const sponsorChain = normalizeString(
    'sponsor_chain',
    input.execution?.sponsor_chain ?? input.sponsor_chain ?? input.sponsorChain
  );
  const sponsorAsset = normalizeLowerString(
    'sponsor_asset',
    input.execution?.sponsor_asset ?? input.sponsor_asset ?? input.sponsorAsset
  );
  const normalizedSponsorChain = normalizeLowerString('sponsor_chain', sponsorChain);

  if (sponsorAccountId !== undefined && sponsorAccountId !== sourceAccountId) {
    throw new Error('sponsor_account_id must match sourceAccountId');
  }
  if (sponsorAccountId !== undefined) {
    ensurePattern(
      'sponsor_account_id',
      sponsorAccountId,
      /^[a-zA-Z0-9:_-]{3,128}$/,
      'must be 3-128 chars of [a-zA-Z0-9:_-]'
    );
  }
  if (normalizedSponsorChain !== undefined && normalizedSponsorChain !== asset.chain) {
    throw new Error('sponsor_chain must match payment asset chain');
  }
  if (sponsorAsset !== undefined && sponsorAsset !== asset.asset) {
    throw new Error('sponsor_asset must match payment asset');
  }
  if ((sponsorshipMode ?? 'none') === 'paymaster' && sponsorAccountId === undefined) {
    throw new Error('sponsor_account_id is required for paymaster sponsorship');
  }

  return {
    mode: 'erc4337',
    smart_account_id: smartAccountId,
    entry_point: entryPoint,
    sponsorship_mode: sponsorshipMode ?? 'none',
    sponsor_account_id: sponsorAccountId,
    sponsor_chain: normalizedSponsorChain ?? asset.chain,
    sponsor_asset: sponsorAsset ?? asset.asset,
    allow_legacy_fallback:
      input.execution?.allow_legacy_fallback ?? input.allow_legacy_fallback ?? input.allowLegacyFallback
  };
}

function resolveUserOpHash(input: AccountAbstractionBoundaryInput): string | undefined {
  const userOpHash = normalizeLowerString('user_op_hash', input.user_op_hash ?? input.userOpHash);
  if (userOpHash !== undefined) {
    ensurePattern('user_op_hash', userOpHash, /^0x[a-f0-9]{8,}$/, 'must be a lowercase hex string');
  }
  return userOpHash;
}

export function resolveUnifiedAssetReference(input: UnifiedAssetBoundaryInput): UnifiedAssetReference {
  const canonicalChain = normalizeLowerString('asset.chain', input.asset?.chain);
  const legacyChain =
    normalizeLowerString('chain', input.chain) ??
    normalizeLowerString('chainId', input.chainId) ??
    normalizeLowerString('chain_id', input.chain_id);

  const canonicalAsset = normalizeLowerString('asset.asset', input.asset?.asset);
  const legacyAsset =
    normalizeLowerString('assetId', input.assetId) ?? normalizeLowerString('asset_id', input.asset_id);

  const canonicalDecimals = normalizeDecimals('asset.decimals', input.asset?.decimals);
  const legacyDecimals =
    normalizeDecimals('decimals', input.decimals) ??
    normalizeDecimals('assetDecimals', input.assetDecimals) ??
    normalizeDecimals('asset_decimals', input.asset_decimals);

  const chain = ensureConsistentString('chain', canonicalChain, legacyChain);
  const asset = ensureConsistentString('asset', canonicalAsset, legacyAsset);
  const decimals = ensureConsistentDecimals(canonicalDecimals, legacyDecimals);
  ensurePattern('chain', chain, /^[a-z0-9]+:[a-z0-9._-]+$/, 'must match namespace:reference in lowercase');
  ensurePattern('asset', asset, /^[a-z0-9._-]+$/, 'must be lowercase [a-z0-9._-]+');

  return { chain, asset, decimals };
}

export function adoptPaymentIntentBoundary(input: PaymentIntentBoundaryInput): PaymentIntent {
  const {
    asset: _asset,
    chain,
    chainId,
    chain_id,
    assetId,
    asset_id,
    decimals,
    assetDecimals,
    asset_decimals,
    execution: _execution,
    execution_mode,
    executionMode,
    allow_legacy_fallback,
    allowLegacyFallback,
    smart_account_id,
    smartAccountId,
    entry_point,
    entryPoint,
    sponsorship_mode,
    sponsorshipMode,
    sponsor_account_id,
    sponsorAccountId,
    sponsor_chain,
    sponsorChain,
    sponsor_asset,
    sponsorAsset,
    user_op_hash,
    userOpHash,
    ...rest
  } = input;
  const canonicalAsset = resolveUnifiedAssetReference(input);
  const execution = resolveExecutionBoundary(input, rest.sourceAccountId, canonicalAsset);
  return {
    ...rest,
    asset: canonicalAsset,
    assetId: canonicalAsset.asset,
    user_op_hash: resolveUserOpHash(input),
    execution
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
  const {
    asset: _asset,
    chain,
    chainId,
    chain_id,
    assetId,
    asset_id,
    decimals,
    assetDecimals,
    asset_decimals,
    execution: _execution,
    execution_mode,
    executionMode,
    allow_legacy_fallback,
    allowLegacyFallback,
    smart_account_id,
    smartAccountId,
    entry_point,
    entryPoint,
    sponsorship_mode,
    sponsorshipMode,
    sponsor_account_id,
    sponsorAccountId,
    sponsor_chain,
    sponsorChain,
    sponsor_asset,
    sponsorAsset,
    user_op_hash,
    userOpHash,
    ...rest
  } = input;
  const canonicalAsset = resolveUnifiedAssetReference(input);
  const execution = resolveExecutionBoundary(input, rest.sourceAccountId, canonicalAsset);
  return {
    ...rest,
    asset: canonicalAsset,
    assetId: canonicalAsset.asset,
    user_op_hash: resolveUserOpHash(input),
    execution
  };
}
