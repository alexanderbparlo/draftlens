// ── Basis of accounting ──────────────────────────────────────────────────────

export type BasisOfAccounting =
  | 'U.S. GAAP'
  | 'IFRS'
  | 'Non-U.S. GAAP'
  | 'Cash Basis'
  | 'Tax Basis'
  | 'Other'

export const SUPPORTED_BASES: BasisOfAccounting[] = ['U.S. GAAP']

export const BASIS_OPTIONS: BasisOfAccounting[] = [
  'U.S. GAAP',
  'IFRS',
  'Non-U.S. GAAP',
  'Cash Basis',
  'Tax Basis',
  'Other',
]

export const UNSUPPORTED_BASIS_MESSAGE =
  'DraftLens currently supports U.S. GAAP financial statements only. Support for IFRS, non-U.S. GAAP, cash basis, and tax basis financial statements is planned for a future version.'

// ── Threshold configuration ──────────────────────────────────────────────────

export interface VarianceThresholds {
  percent: number                    // default 0.50 (50%)
  pc_nav_percent: number             // default 0.05 (5% of PC/NAV)
  dollar_override: number | null     // user-specified dollar override; null = use pc_nav_percent
  computed_dollar: number | null     // computed from pc_nav_percent × total PC/NAV; null if PC/NAV not found
  fallback_active: boolean           // true if PC/NAV could not be extracted; percent-only mode
}

// ── Statement types ──────────────────────────────────────────────────────────

export type StatementType =
  | 'Balance Sheet'
  | 'Income Statement'
  | 'Statement of Changes in Partners Capital'
  | 'Statement of Cash Flows'
  | 'Footnotes'
  | 'Supplemental Schedules'

export type FlagSeverity = 'High' | 'Medium' | 'Low' | 'Info'

// ── Variance flags ───────────────────────────────────────────────────────────

export interface VarianceFlag {
  id: string
  statement: StatementType
  line_item: string
  prior_year_value: number | null
  current_year_value: number | null
  dollar_change: number | null
  percent_change: number | null
  pc_nav_percent: number | null
  severity: FlagSeverity
  drill_down_guidance: string
}

// ── Language and formatting flags ────────────────────────────────────────────

export type LanguageFlagType =
  | 'Header Change'
  | 'Line Item Rename'
  | 'Increase/Decrease Language'
  | 'Gain/Loss Language'
  | 'Bucketing Change'
  | 'Footnote Language Change'
  | 'Supplemental Schedule Change'
  | 'Accounting Guidance Change'
  | 'Other Formatting'

export interface LanguageFlag {
  id: string
  statement: StatementType
  flag_type: LanguageFlagType
  location: string
  prior_year_text: string
  current_year_text: string
  assessment: string
  asc_reference: string
  requires_attention: boolean
}

// ── Clerical flags ───────────────────────────────────────────────────────────

export type ClericalFlagType =
  | 'Spelling Error'
  | 'Grammatical Error'
  | 'Numerical Inconsistency'
  | 'Date Error'
  | 'Missing Section'
  | 'Cross-Reference Error'

export interface ClericalFlag {
  id: string
  statement: StatementType
  flag_type: ClericalFlagType
  location: string
  description: string
  current_year_text: string
  suggested_correction: string
}

// ── Expansion layer ──────────────────────────────────────────────────────────

export interface DiffSection {
  statement: StatementType
  section_title: string
  prior_year_content: string
  current_year_content: string
  has_changes: boolean
  change_summary: string
}

// ── Agent notes ──────────────────────────────────────────────────────────────

export interface AgentNote {
  id: string
  category: 'Variance' | 'Language' | 'Clerical' | 'General'
  note: string
  related_flag_ids: string[]
}

// ── Full analysis schema ─────────────────────────────────────────────────────

export interface AnalysisMetadata {
  prior_year_period: string
  current_year_period: string
  fund_name: string
  fund_type: string
  basis_of_accounting: string
  total_partners_capital_current_year: number | null
  statements_identified: StatementType[]
  extraction_confidence: 'High' | 'Medium' | 'Low'
  user_notes_acknowledged: string
  thresholds_applied: VarianceThresholds
}

export interface Analysis {
  metadata: AnalysisMetadata
  variance_flags: VarianceFlag[]
  language_flags: LanguageFlag[]
  clerical_flags: ClericalFlag[]
  diff_sections: DiffSection[]
  agent_notes: AgentNote[]
  chat_response: string
}

// ── Document upload ──────────────────────────────────────────────────────────

export interface UploadedDocument {
  name: string
  type: string
  data: string  // base64
}

// ── Request types ────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  prior_year_document: UploadedDocument
  current_year_document: UploadedDocument
  basis_of_accounting: BasisOfAccounting
  user_notes: string
  thresholds: VarianceThresholds
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  current_analysis: Analysis
  conversation_history: ChatMessage[]
}

// ── API envelope ─────────────────────────────────────────────────────────────

export type APIResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── App state ────────────────────────────────────────────────────────────────

export type AppState = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error'
export type ActiveLayer = 'summary' | 'expansion' | 'chat'

export interface UIState {
  appState: AppState
  analysis: Analysis | null
  conversationHistory: ChatMessage[]
  isChatOpen: boolean
  isExpansionOpen: boolean
  error: string | null
}
