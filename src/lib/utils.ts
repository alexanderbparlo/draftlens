import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  Analysis,
  VarianceFlag,
  VarianceThresholds,
  FlagSeverity,
} from '@/types'

// ── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(value: number | null, currency = 'USD'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000)     return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)         return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

export function formatCurrencyExact(value: number | null, currency = 'USD'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  return `${symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatString(value: string | null | undefined): string {
  if (!value || value.trim() === '') return '—'
  return value
}

// ── Document helpers ─────────────────────────────────────────────────────────

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function validateDocumentFile(file: File): {
  valid: boolean
  error?: string
} {
  const acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ]
  const maxSizeMB = 10

  if (!acceptedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PDF and Word documents are supported.' }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must be under ${maxSizeMB}MB.` }
  }

  return { valid: true }
}

// ── Schema helpers ───────────────────────────────────────────────────────────

export function parseAnalysisResponse(raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

// ── Threshold filter ─────────────────────────────────────────────────────────
//
// The agent returns variance candidates with prior_year_value, current_year_value,
// dollar_change, and percent_change. The application is the source of truth for
// thresholds — it computes the dollar materiality from PC/NAV (or applies the
// user's dollar override) and filters out candidates that don't meet BOTH
// conditions. If PC/NAV could not be extracted, we fall back to percent-only.

export interface ThresholdResult {
  thresholds: VarianceThresholds
  filteredFlags: VarianceFlag[]
  removedCount: number
}

export function applyThresholds(
  analysis: Analysis,
  inputThresholds: VarianceThresholds
): ThresholdResult {
  const totalPC = analysis.metadata.total_partners_capital_current_year

  // Build the resolved threshold object.
  const thresholds: VarianceThresholds = {
    percent: inputThresholds.percent,
    pc_nav_percent: inputThresholds.pc_nav_percent,
    dollar_override: inputThresholds.dollar_override,
    computed_dollar: null,
    fallback_active: false,
  }

  if (inputThresholds.dollar_override !== null && inputThresholds.dollar_override > 0) {
    thresholds.computed_dollar = inputThresholds.dollar_override
  } else if (totalPC !== null && totalPC !== undefined && Number.isFinite(totalPC)) {
    thresholds.computed_dollar = inputThresholds.pc_nav_percent * totalPC
  } else {
    thresholds.fallback_active = true
  }

  // Filter candidate flags.
  const dollarThreshold = thresholds.computed_dollar
  const percentThreshold = thresholds.percent

  const filtered: VarianceFlag[] = []
  for (const raw of analysis.variance_flags ?? []) {
    const flag: VarianceFlag = {
      ...raw,
      pc_nav_percent:
        raw.dollar_change !== null && totalPC !== null && totalPC !== 0
          ? Math.abs(raw.dollar_change) / totalPC
          : null,
    }

    const dollarChange = flag.dollar_change !== null ? Math.abs(flag.dollar_change) : null
    const percentChange = flag.percent_change !== null ? Math.abs(flag.percent_change) : null

    const meetsPercent = percentChange !== null && percentChange >= percentThreshold

    if (thresholds.fallback_active) {
      if (meetsPercent) filtered.push(flag)
      continue
    }

    const meetsDollar =
      dollarThreshold !== null && dollarChange !== null && dollarChange >= dollarThreshold

    if (meetsPercent && meetsDollar) {
      filtered.push(flag)
    }
  }

  return {
    thresholds,
    filteredFlags: filtered,
    removedCount: (analysis.variance_flags?.length ?? 0) - filtered.length,
  }
}

// ── Severity styling ─────────────────────────────────────────────────────────

export function severityClass(severity: FlagSeverity): string {
  switch (severity) {
    case 'High':   return 'text-data-negative border-data-negative/30 bg-data-negative/5'
    case 'Medium': return 'text-draft border-draft/30 bg-draft/5'
    case 'Low':    return 'text-accent border-accent/30 bg-accent/5'
    case 'Info':   return 'text-text-secondary border-white/10 bg-white/2'
  }
}

export function severityRank(severity: FlagSeverity): number {
  return { High: 0, Medium: 1, Low: 2, Info: 3 }[severity]
}

export function confidenceColor(
  confidence: 'High' | 'Medium' | 'Low' | ''
): string {
  switch (confidence) {
    case 'High':   return 'text-data-positive border-data-positive/30'
    case 'Medium': return 'text-draft border-draft/30'
    case 'Low':    return 'text-data-negative border-data-negative/30'
    default:       return 'text-text-secondary border-white/10'
  }
}
