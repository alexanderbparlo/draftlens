// ─────────────────────────────────────────────────────────────────────────────
// Request validation guards
// Reject oversized, malformed, or adversarial payloads before they reach the model.
// ─────────────────────────────────────────────────────────────────────────────

import type { Analysis, ChatMessage } from '@/types'

export const LIMITS = {
  // analyze: two ~10MB documents base64-encoded ≈ 27MB. Headroom to 35MB.
  MAX_ANALYZE_BODY_BYTES: 35 * 1024 * 1024,
  MAX_USER_NOTES_CHARS: 5_000,
  // chat
  MAX_CHAT_MESSAGE_CHARS: 5_000,
  MAX_HISTORY_ITEMS: 100,
  MAX_CHAT_BODY_BYTES: 4 * 1024 * 1024,
} as const

export function checkContentLength(
  request: Request,
  maxBytes: number
): string | null {
  const header = request.headers.get('content-length')
  if (!header) return null
  const length = Number.parseInt(header, 10)
  if (Number.isFinite(length) && length > maxBytes) {
    return `Request body exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit.`
  }
  return null
}

export function isValidAnalysisShape(x: unknown): x is Analysis {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (!o.metadata || typeof o.metadata !== 'object') return false
  if (typeof o.chat_response !== 'string') return false
  const arrayKeys = [
    'variance_flags',
    'language_flags',
    'clerical_flags',
    'diff_sections',
    'agent_notes',
  ]
  for (const k of arrayKeys) {
    if (!Array.isArray(o[k])) return false
  }
  return true
}

export function isValidChatMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.role !== 'user' && o.role !== 'assistant') return false
  if (typeof o.content !== 'string') return false
  return true
}
