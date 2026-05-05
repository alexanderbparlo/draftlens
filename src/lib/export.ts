// ─────────────────────────────────────────────────────────────────────────────
// CSV export helpers
//
// PDF export is handled by window.print() + the print stylesheet in globals.css
// (no extra dependency). Each CSV is generated client-side and triggered as a
// download via a Blob URL.
// ─────────────────────────────────────────────────────────────────────────────

import type { Analysis } from '@/types'

// RFC 4180-ish escaping. Quote any field that contains a comma, quote, CR, LF,
// or leading/trailing whitespace; double internal quotes.
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCSV(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export function downloadCSV(filename: string, csv: string) {
  // Prepend UTF-8 BOM so Excel renders unicode correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Filename helper ──────────────────────────────────────────────────────────

export function exportFilename(analysis: Analysis, suffix: string): string {
  const fund = (analysis.metadata.fund_name || 'fund')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 60)
  const period = (analysis.metadata.current_year_period || '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 24)
  const date = new Date().toISOString().slice(0, 10)
  return [fund, period, suffix, date].filter(Boolean).join('-') + '.csv'
}

// ── Per-category CSV builders ────────────────────────────────────────────────

export function varianceCSV(analysis: Analysis): string {
  const rows: (string | number | null)[][] = [
    [
      'ID',
      'Statement',
      'Line Item',
      'Prior Year Value',
      'Current Year Value',
      'Dollar Change',
      'Percent Change',
      '% of PC/NAV',
      'Severity',
      'Drill-Down Guidance',
    ],
  ]
  for (const f of analysis.variance_flags) {
    rows.push([
      f.id,
      f.statement,
      f.line_item,
      f.prior_year_value,
      f.current_year_value,
      f.dollar_change,
      f.percent_change,
      f.pc_nav_percent,
      f.severity,
      f.drill_down_guidance,
    ])
  }
  return toCSV(rows)
}

export function languageCSV(analysis: Analysis): string {
  const rows: (string | number | null)[][] = [
    [
      'ID',
      'Statement',
      'Location',
      'Flag Type',
      'Prior Year Text',
      'Current Year Text',
      'Assessment',
      'ASC Reference',
      'Requires Attention',
    ],
  ]
  for (const f of analysis.language_flags) {
    rows.push([
      f.id,
      f.statement,
      f.location,
      f.flag_type,
      f.prior_year_text,
      f.current_year_text,
      f.assessment,
      f.asc_reference,
      f.requires_attention ? 'Yes' : 'No',
    ])
  }
  return toCSV(rows)
}

export function clericalCSV(analysis: Analysis): string {
  const rows: (string | number | null)[][] = [
    [
      'ID',
      'Statement',
      'Location',
      'Flag Type',
      'Description',
      'Current Year Text',
      'Suggested Correction',
    ],
  ]
  for (const f of analysis.clerical_flags) {
    rows.push([
      f.id,
      f.statement,
      f.location,
      f.flag_type,
      f.description,
      f.current_year_text,
      f.suggested_correction,
    ])
  }
  return toCSV(rows)
}

// Combined "all flags" CSV: one row per flag with a Category column. Uses a
// shared subset of columns so the file opens flat in Excel.
export function combinedCSV(analysis: Analysis): string {
  const rows: (string | number | null)[][] = [
    [
      'Category',
      'ID',
      'Statement',
      'Location / Line Item',
      'Type',
      'Severity / Attention',
      'Detail',
      'ASC Reference',
    ],
  ]
  for (const f of analysis.variance_flags) {
    rows.push([
      'Variance',
      f.id,
      f.statement,
      f.line_item,
      'Numeric variance',
      f.severity,
      [
        `Prior: ${f.prior_year_value ?? '—'}`,
        `Current: ${f.current_year_value ?? '—'}`,
        `Δ$: ${f.dollar_change ?? '—'}`,
        `Δ%: ${f.percent_change ?? '—'}`,
        `Guidance: ${f.drill_down_guidance}`,
      ].join(' | '),
      '',
    ])
  }
  for (const f of analysis.language_flags) {
    rows.push([
      'Language',
      f.id,
      f.statement,
      f.location,
      f.flag_type,
      f.requires_attention ? 'Requires attention' : 'Informational',
      `Prior: ${f.prior_year_text} | Current: ${f.current_year_text} | Assessment: ${f.assessment}`,
      f.asc_reference,
    ])
  }
  for (const f of analysis.clerical_flags) {
    rows.push([
      'Clerical',
      f.id,
      f.statement,
      f.location,
      f.flag_type,
      '',
      `${f.description} | Suggested: ${f.suggested_correction}`,
      '',
    ])
  }
  return toCSV(rows)
}
