# AI Assistant Project Instructions

These guidelines orient AI coding agents for the `volterra-call-intelligence` codebase (Next.js + HubSpot + ElevenLabs + Supabase + PBX Provider). Focus on existing patterns—do not introduce generic boilerplate or deprecated OAuth flows.

## Architectural Essentials

- Multi-layer design:
  - `app/api/**` – Next.js route handlers (HubSpot embedded app endpoints, webhooks for ElevenLabs, HubSpot, PBX provider). Keep handlers small; defer business logic to lib modules.
  - `lib/mcp-servers/*` – Progressive disclosure service wrappers (HubSpot, ElevenLabs, Supabase) exposing granular functions; prefer importing these over raw SDK calls.
  - `lib/mcp-servers/skills/*` – Orchestration skills (e.g. `sync-conversation-to-hubspot.ts`) composing multiple server APIs into one idempotent workflow. Add new multi-step flows here.
  - `lib/analysis/conversationAnalyzer.ts` – Heuristic (non-ML) transcript analysis; safe to extend. Avoid heavy external dependencies unless justified.
  - `supabase/migrations/` – Sequential, additive SQL schema migrations (nnn_description.sql). Never reorder or repurpose existing numbers; create a new numeric file for changes.
- Telephony provider integration: webhook at `app/api/webhooks/telavox/route.ts` normalizes external event types (ringing/answer/hangup) to internal (`call.started`, etc.), upserts into `telavox_call_sessions`, triggers ElevenLabs transcription when recording ready. Maintain constant-time secret comparisons and mapping logic.
- HubSpot auth model: Single private app token (`HUBSPOT_PRIVATE_ACCESS_TOKEN`). Legacy OAuth helpers are intentionally stubbed; do NOT reintroduce per-user OAuth.

## Key Conventions & Patterns

- Environment variables (see root `README.md`): treat missing required vars as configuration errors—fail fast (`getHubSpotAccessToken`, ElevenLabs client constructor). If adding new secrets, document them in README and sample `.env.local`.
- Naming in API routes: nouns first, status/detail last (`calls/[sessionId]/status`, `contacts/[id]/conversations`). Follow existing segment style when adding endpoints.
- Data flow (call lifecycle): initiation -> status polling -> external webhook -> analysis -> HubSpot sync via skills. Preserve this pipeline; augment by inserting steps after analysis, before sync.
- Rate limiting: use `withRateLimitHandling` & `rateLimiter.updateFromHeaders` around HubSpot write operations; never ad‑hoc sleep logic.
- Idempotency: Skills return structured results (`{ success, contactId, ... }`). When adding a skill, ensure safe retry (check existing HubSpot IDs via Supabase sync history before creating duplicates).
- Conversation formatting: Use `formatConversationForDisplay` for UI-specific truncation/aggregation instead of duplicating formatting logic.

## When Implementing Changes

- Prefer extending MCP server modules instead of embedding API calls directly in route handlers.
- For new multi-step workflows (e.g., PBX provider → HubSpot sync), create a skill in `lib/mcp-servers/skills/` and invoke from webhook handler.
- Extend analysis heuristics by adding lightweight functions in `conversationAnalyzer.ts` (maintain pure, deterministic style; no network calls).
- Add database columns via a new migration file (next sequential integer). Include only DDL relevant to change; avoid destructive ALTERs without backfill plan.
- Use TypeScript narrow types for status fields (`'pending' | 'in_progress' | 'failed' | 'completed'`)—keep status enums centralized where defined.

## Testing & Validation

- Scripts: `npm run dev`, `build`, `lint`, `type-check`. Run `type-check` after structural changes.
- For new Supabase queries: verify indexes or add them in migrations if accessing by newly added foreign keys or frequently filtered columns.
- Webhook robustness: validate required IDs early; log structured errors; keep responses JSON `{ ok: true }` on ignored events.

## Common Pitfalls to Avoid

- Reintroducing OAuth flows (deprecated modules throw intentionally).
- Direct HubSpot associations using numeric IDs—use semantic association types (`deal_to_contact`).
- Creating duplicate contacts/deals—prefer search/update helpers (`createOrUpdateContact`).
- Blocking waits instead of exponential backoff for rate limits.
- Mutating transcript or insight schema without migration + downstream formatter updates.

## Example Extension Workflow

1. Add a new post-analysis enrichment field (e.g. `risk_score`): create migration `012_add_risk_score.sql` adding column to `insights` table.
2. Update `conversationAnalyzer.ts` to compute `riskScore` and include in return.
3. Propagate UI: adjust `components/insights/*` to render badge (use existing sentiment color pattern as reference).
4. Update any skill that syncs insights to HubSpot to include new property where relevant.

Clarify any section you find incomplete or if new integration patterns emerge so this file can evolve incrementally.
