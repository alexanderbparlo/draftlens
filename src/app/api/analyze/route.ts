import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { DRAFTLENS_SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/systemPrompt'
import { checkRateLimit, rateLimitHeaders, getClientIdentifier } from '@/lib/rateLimit'
import { LIMITS, checkContentLength, isValidAnalysisShape } from '@/lib/requestGuards'
import { parseAnalysisResponse, applyThresholds } from '@/lib/utils'
import type {
  AnalyzeRequest,
  Analysis,
  APIResponse,
  UploadedDocument,
  VarianceThresholds,
} from '@/types'
import { SUPPORTED_BASES } from '@/types'

export const maxDuration = 300

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'
const ALLOWED_TYPES = [PDF_MIME, DOCX_MIME, DOC_MIME]

type DocumentBlock =
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title: string }
  | { type: 'document'; source: { type: 'text'; media_type: 'text/plain'; data: string }; title: string }

type ContentBlock = DocumentBlock | { type: 'text'; text: string }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function badRequest(error: string, headers: Record<string, string> = {}, status = 400) {
  return NextResponse.json<APIResponse<never>>({ success: false, error }, { status, headers })
}

function validateDoc(label: string, doc: unknown): string | null {
  if (!doc || typeof doc !== 'object') return `${label} document is missing.`
  const d = doc as Record<string, unknown>
  if (typeof d.name !== 'string' || typeof d.type !== 'string' || typeof d.data !== 'string') {
    return `${label} document is malformed.`
  }
  if (!ALLOWED_TYPES.includes(d.type)) {
    return `${label} document has unsupported type "${d.type}". Only PDF and Word are accepted.`
  }
  if (!d.data || d.data.length < 100) {
    return `${label} document appears to be empty or corrupt.`
  }
  // base64 of 10MB binary ≈ 13.3M chars — cap at 14M.
  if (d.data.length > 14_000_000) {
    return `${label} document exceeds the 10MB size limit.`
  }
  return null
}

async function buildDocumentBlock(label: string, doc: UploadedDocument): Promise<{ block: DocumentBlock | null; error?: string }> {
  const title = `${label}: ${doc.name}`
  if (doc.type === PDF_MIME) {
    return {
      block: {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: doc.data },
        title,
      },
    }
  }
  if (doc.type === DOCX_MIME) {
    try {
      const buffer = Buffer.from(doc.data, 'base64')
      const { value: extractedText } = await mammoth.extractRawText({ buffer })
      if (!extractedText.trim()) {
        return { block: null, error: `No readable text found in "${doc.name}".` }
      }
      if (extractedText.length > LIMITS.MAX_EXTRACTED_TEXT_CHARS) {
        return { block: null, error: `Word document "${doc.name}" contains too much text. Please export as PDF instead.` }
      }
      return {
        block: {
          type: 'document',
          source: { type: 'text', media_type: 'text/plain', data: extractedText },
          title,
        },
      }
    } catch (err) {
      console.error(`[mammoth] Failed to read "${doc.name}":`, err)
      return {
        block: null,
        error: `Failed to read Word document "${doc.name}". Please ensure it is a valid .docx file.`,
      }
    }
  }
  return {
    block: null,
    error: `Legacy .doc files are not supported. Please save "${doc.name}" as .docx or PDF.`,
  }
}

export async function POST(request: NextRequest) {
  const sizeError = checkContentLength(request, LIMITS.MAX_ANALYZE_BODY_BYTES)
  if (sizeError) return badRequest(sizeError, {}, 413)

  const rateResult = await checkRateLimit('analyze', getClientIdentifier(request))
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return badRequest(
      `Rate limit exceeded. You can analyze up to 10 comparisons per hour. Resets at ${new Date(rateResult.reset).toLocaleTimeString()}.`,
      headers,
      429
    )
  }

  let body: AnalyzeRequest
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid request body.', headers)
  }

  const {
    prior_year_document,
    current_year_document,
    basis_of_accounting,
    user_notes,
    thresholds,
  } = body

  // ── Validate basis ────────────────────────────────────────────────────────
  if (!basis_of_accounting || !SUPPORTED_BASES.includes(basis_of_accounting)) {
    return badRequest(
      'DraftLens currently supports U.S. GAAP financial statements only.',
      headers
    )
  }

  // ── Validate documents ────────────────────────────────────────────────────
  for (const [label, doc] of [
    ['Prior year', prior_year_document],
    ['Current year', current_year_document],
  ] as const) {
    const err = validateDoc(label, doc)
    if (err) return badRequest(err, headers)
  }

  // ── Validate user notes ───────────────────────────────────────────────────
  const notes = typeof user_notes === 'string' ? user_notes : ''
  if (notes.length > LIMITS.MAX_USER_NOTES_CHARS) {
    return badRequest(
      `Analysis notes too long (max ${LIMITS.MAX_USER_NOTES_CHARS} characters).`,
      headers
    )
  }

  // ── Validate thresholds ───────────────────────────────────────────────────
  if (!thresholds || typeof thresholds !== 'object') {
    return badRequest('Threshold configuration is required.', headers)
  }
  const t = thresholds as Partial<VarianceThresholds>
  if (typeof t.percent !== 'number' || t.percent <= 0 || t.percent > 1) {
    return badRequest('Percent threshold must be a number between 0 and 1 (decimal).', headers)
  }
  if (typeof t.pc_nav_percent !== 'number' || t.pc_nav_percent <= 0 || t.pc_nav_percent > 1) {
    return badRequest('PC/NAV percent threshold must be a number between 0 and 1 (decimal).', headers)
  }
  if (
    t.dollar_override !== null &&
    t.dollar_override !== undefined &&
    (typeof t.dollar_override !== 'number' || t.dollar_override < 0)
  ) {
    return badRequest('Dollar override must be a non-negative number or null.', headers)
  }

  const requestedThresholds: VarianceThresholds = {
    percent: t.percent,
    pc_nav_percent: t.pc_nav_percent,
    dollar_override: t.dollar_override ?? null,
    computed_dollar: null,
    fallback_active: false,
  }

  // ── Build content blocks ──────────────────────────────────────────────────
  const content: ContentBlock[] = []

  const priorBlock = await buildDocumentBlock(
    'PRIOR YEAR FINANCIAL STATEMENTS (ISSUED)',
    prior_year_document
  )
  if (!priorBlock.block) return badRequest(priorBlock.error ?? 'Prior year document failed.', headers)
  content.push(priorBlock.block)

  const currentBlock = await buildDocumentBlock(
    'CURRENT YEAR FINANCIAL STATEMENTS (DRAFT)',
    current_year_document
  )
  if (!currentBlock.block) return badRequest(currentBlock.error ?? 'Current year document failed.', headers)
  content.push(currentBlock.block)

  const dollarLine =
    requestedThresholds.dollar_override !== null
      ? `$${requestedThresholds.dollar_override.toLocaleString('en-US')} (user override)`
      : `${(requestedThresholds.pc_nav_percent * 100).toFixed(2)}% of current year Partner's Capital / NAV (computed by application after PC/NAV extraction)`

  const instruction = `BASIS OF ACCOUNTING: ${basis_of_accounting}

MATERIALITY THRESHOLDS (both conditions must be met to flag a variance):
- Percent threshold: ${(requestedThresholds.percent * 100).toFixed(2)}% change from prior year value
- Dollar threshold: ${dollarLine}
- Dollar override active: ${requestedThresholds.dollar_override !== null}

USER NOTES:
${notes.trim() || 'No notes provided.'}

Please analyze both documents and return the complete JSON analysis object.

IMPORTANT: For variance_flags, return ALL numeric line items where you observe a meaningful change between the two periods, with prior_year_value, current_year_value, dollar_change, and percent_change populated. The application will apply the materiality thresholds and filter the list. Set pc_nav_percent to null — the application computes it.`

  content.push({ type: 'text', text: instruction })

  // ── Call Opus 4.7 ─────────────────────────────────────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: MODEL_CONFIG.model,
      max_tokens: MODEL_CONFIG.max_tokens,
      thinking: MODEL_CONFIG.thinking,
      output_config: MODEL_CONFIG.output_config,
      system: DRAFTLENS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in API response')
    }

    const parsed = parseAnalysisResponse(textBlock.text)
    if (!isValidAnalysisShape(parsed)) {
      throw new Error('Model returned unexpected response structure')
    }
    const rawAnalysis = parsed

    // Apply thresholds: compute the dollar threshold from the model-extracted PC/NAV
    // (or use the user dollar override) and filter variance candidates that don't
    // satisfy both conditions.
    const { thresholds: appliedThresholds, filteredFlags } = applyThresholds(
      rawAnalysis,
      requestedThresholds
    )

    const analysis: Analysis = {
      ...rawAnalysis,
      variance_flags: filteredFlags,
      metadata: {
        ...rawAnalysis.metadata,
        basis_of_accounting,
        thresholds_applied: appliedThresholds,
      },
    }

    return NextResponse.json<APIResponse<Analysis>>(
      { success: true, data: analysis },
      { status: 200, headers }
    )
  } catch (err) {
    console.error('[/api/analyze] Error:', err)
    const message = err instanceof Error ? err.message : ''
    if (message.includes('JSON') || message.includes('response structure')) {
      return badRequest(
        'The model returned an unexpected response format. Please try again.',
        headers,
        502
      )
    }
    return badRequest('Analysis failed. Please try again.', headers, 500)
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 })
}
