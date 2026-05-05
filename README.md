# DraftLens

Side-by-side comparison and analysis tool for fund financial statements. DraftLens compares a prior year (issued/audited) document against a current year (draft) document, flagging material variances, language and formatting changes, and clerical errors. Built for fund accountants, fund administrators, and auditors. Powered by Claude Opus 4.7.

DraftLens is part of a portfolio of AI tools for alternative-asset workflows; it shares its stack, design language, and rate-limiting approach with [FundLens](../fundlens).

---

## Supported documents

- PDF (`application/pdf`)
- Word (`.docx` — `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- 10MB maximum per document
- Two uploads per analysis: one prior year and one current year, each containing the full set of statements for that period

Legacy `.doc` (Word 97-2003 binary) is not supported — save as `.docx` or PDF.

---

## Basis of accounting

DraftLens currently supports **U.S. GAAP only** (specifically the investment company guidance under ASC 946). The basis-of-accounting selector includes IFRS, Non-U.S. GAAP, Cash Basis, Tax Basis, and Other for forward compatibility, but selecting any of these displays a message and disables the Analyze button. Support for additional bases is planned for a future version.

---

## Materiality threshold logic

A variance is flagged only when **both** of the following are true:

1. **Percent threshold** — the absolute percentage change from the prior year value exceeds the user-selected percentage (default 50%).
2. **Dollar threshold** — the absolute dollar change exceeds either:
   - **Default:** 5% of the current year total Partner's Capital / NAV (auto-computed by the application from the value the model extracts), or
   - **Override:** a user-specified fixed dollar amount entered on the upload screen. When set, the override replaces the 5%-of-PC/NAV default.

If the application cannot extract total Partner's Capital / NAV from the document, it falls back to the percentage threshold only and surfaces a warning in the dashboard header.

The application — not the AI agent — is the source of truth for thresholds. The agent returns variance candidates with raw values; the application computes `pc_nav_percent` and filters the list before display.

---

## Local setup

```bash
git clone <this-repo>
cd draftlens
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Visit `http://localhost:3000`.

### Type-checking and linting

```bash
npm run type-check
npm run lint
```

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Server-side only. Never prefix with `NEXT_PUBLIC_`. |
| `UPSTASH_REDIS_REST_URL` | prod | Enables persistent rate limiting. Optional in dev. |
| `UPSTASH_REDIS_REST_TOKEN` | prod | See above. |
| `NEXT_PUBLIC_APP_NAME` | no | Defaults to "DraftLens". |
| `NEXT_PUBLIC_APP_VERSION` | no | Defaults to "0.1.0". |

`.env.local` is gitignored.

---

## Rate limits

| Route | Limit |
| --- | --- |
| `/api/analyze` | 10 requests per hour per client |
| `/api/chat` | 60 requests per hour per client |

In production, limits are tracked in Upstash Redis with a sliding-window strategy. In local development (no Upstash credentials), an in-memory store is used; it resets on every server restart.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   POST — runs comparison analysis
│   │   └── chat/route.ts      POST — answers follow-up questions
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/ChatInterface.tsx
│   ├── dashboard/             SummaryDashboard, VarianceTable, LanguageFlags, ClericalFlags, AgentNotes
│   ├── expansion/ExpansionView.tsx
│   └── upload/UploadScreen.tsx
├── hooks/useDraftLens.ts
├── lib/
│   ├── rateLimit.ts
│   ├── requestGuards.ts
│   ├── systemPrompt.ts
│   └── utils.ts
└── types/index.ts
```

---

## Deployment

The project deploys to Vercel as-is. The `vercel.json` extends the `/api/analyze` function timeout to 5 minutes (the default 10s is insufficient for two large PDFs through Opus 4.7 with extended thinking). Set `ANTHROPIC_API_KEY` and the Upstash credentials in the Vercel project's environment settings.

---

## Disclaimer

DraftLens is an analytical aid. All findings should be reviewed by a qualified accountant. ASC references should be verified against current authoritative literature — accounting standards are updated continuously and the model's training data has a cutoff date.
