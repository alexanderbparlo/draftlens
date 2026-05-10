import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { DRAFTLENS_SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/systemPrompt'
import { checkRateLimit, rateLimitHeaders, getClientIdentifier } from '@/lib/rateLimit'
import {
  LIMITS,
  checkContentLength,
  isValidAnalysisShape,
  isValidChatMessage,
} from '@/lib/requestGuards'
import { parseAnalysisResponse } from '@/lib/utils'
import type { ChatRequest, Analysis, APIResponse } from '@/types'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function badRequest(error: string, headers: Record<string, string> = {}, status = 400) {
  return NextResponse.json<APIResponse<never>>({ success: false, error }, { status, headers })
}

export async function POST(request: NextRequest) {
  const sizeError = checkContentLength(request, LIMITS.MAX_CHAT_BODY_BYTES)
  if (sizeError) return badRequest(sizeError, {}, 413)

  const rateResult = await checkRateLimit('chat', getClientIdentifier(request))
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return badRequest('Rate limit exceeded. You can send up to 60 messages per hour.', headers, 429)
  }

  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid request body.', headers)
  }

  const { message, current_analysis, conversation_history } = body

  if (typeof message !== 'string' || !message.trim()) {
    return badRequest('Message is required.', headers)
  }
  if (message.length > LIMITS.MAX_CHAT_MESSAGE_CHARS) {
    return badRequest(
      `Message too long (max ${LIMITS.MAX_CHAT_MESSAGE_CHARS} characters).`,
      headers
    )
  }
  if (!isValidAnalysisShape(current_analysis)) {
    return badRequest(
      'No analysis loaded or analysis payload is malformed. Please run an analysis first.',
      headers
    )
  }
  if (!Array.isArray(conversation_history)) {
    return badRequest('conversation_history must be an array.', headers)
  }
  if (conversation_history.length > LIMITS.MAX_HISTORY_ITEMS) {
    return badRequest(
      `Conversation history too long (max ${LIMITS.MAX_HISTORY_ITEMS} items).`,
      headers
    )
  }
  for (const msg of conversation_history) {
    if (!isValidChatMessage(msg)) {
      return badRequest(
        'Invalid conversation history item: each item must have role "user" or "assistant" and string content.',
        headers
      )
    }
  }

  // Cap context at last 10 exchanges (20 messages) for cost.
  const MAX_HISTORY_PAIRS = 10
  const recent = conversation_history.slice(-(MAX_HISTORY_PAIRS * 2))

  type ApiMessage = { role: 'user' | 'assistant'; content: string }
  const messages: ApiMessage[] = []

  const contextMessage = `Here is the current state of the DraftLens analysis (variance flags have already been filtered by the application using the materiality thresholds shown in metadata.thresholds_applied):

${JSON.stringify(current_analysis, null, 2)}

Use this as your reference for all follow-up questions. Return the complete Analysis JSON with any updates and put your natural-language answer in the chat_response field. Do not modify variance_flags, language_flags, clerical_flags, diff_sections, or thresholds_applied unless the user explicitly asks you to add, remove, or revise a specific item. Echo them back unchanged otherwise.`

  messages.push({ role: 'user', content: contextMessage })
  messages.push({
    role: 'assistant',
    content:
      'Understood. I have the current analysis loaded and will use it as context for your follow-up questions.',
  })

  for (const msg of recent) {
    messages.push({ role: msg.role, content: msg.content })
  }
  messages.push({ role: 'user', content: message.trim() })

  try {
    const response = await anthropic.messages.create({
      model: MODEL_CONFIG.model,
      max_tokens: MODEL_CONFIG.max_tokens,
      thinking: MODEL_CONFIG.thinking,
      output_config: MODEL_CONFIG.output_config,
      system: DRAFTLENS_SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in API response')
    }

    const parsedChat = parseAnalysisResponse(textBlock.text)
    if (!isValidAnalysisShape(parsedChat)) {
      throw new Error('Model returned unexpected response structure')
    }
    const updated = parsedChat

    return NextResponse.json<APIResponse<Analysis>>(
      { success: true, data: updated },
      { status: 200, headers }
    )
  } catch (err) {
    console.error('[/api/chat] Error:', err)
    const m = err instanceof Error ? err.message : ''
    if (m.includes('JSON') || m.includes('response structure')) {
      return badRequest('The model returned an unexpected response format. Please try again.', headers, 502)
    }
    return badRequest('Chat failed. Please try again.', headers, 500)
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 })
}
