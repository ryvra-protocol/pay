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
    input.execution !== undefined
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
    return { mode: 'legacy' };
  }

  const smartAccountId = normalizeString(
    'smart_account_id',
    input.execution?.smart_account_id ?? input.smart_account_id ?? input.smartAccountId
  );
  const entryPoint = normalizeString(
    'entry_point',
    input.execution?.entry_point ?? input.entry_point ?? input.entryPoint
  );
  if (smartAccountId === undefined) {
    throw new Error('smart_account_id is required for erc4337 execution');
  }
  if (entryPoint === undefined) {
    throw new Error('entry_point is required for erc4337 execution');
  }

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
  const sponsorAsset = normalizeString(
    'sponsor_asset',
    input.execution?.sponsor_asset ?? input.sponsor_asset ?? input.sponsorAsset
  );

  if (sponsorAccountId !== undefined && sponsorAccountId !== sourceAccountId) {
    throw new Error('sponsor_account_id must match sourceAccountId');
  }
  if (sponsorChain !== undefined && sponsorChain !== asset.chain) {
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
    sponsor_chain: sponsorChain ?? asset.chain,
    sponsor_asset: sponsorAsset ?? asset.asset
  };
}

function resolveUserOpHash(input: AccountAbstractionBoundaryInput): string | undefined {
  return normalizeString('user_op_hash', input.user_op_hash ?? input.userOpHash);
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
