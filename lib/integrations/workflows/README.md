# Integration Workflows

Reusable workflow patterns composing operations across multiple integrations.

## Available Workflows

| Workflow                    | Status     | Description                                     |
| --------------------------- | ---------- | ----------------------------------------------- |
| `syncTelavoxCallToHubSpot`  | **Active** | Sync Telavox call to HubSpot CRM                |
| `syncConversationToHubSpot` | Legacy     | Sync ElevenLabs conversation (old architecture) |

## Active Workflow: syncTelavoxCallToHubSpot

Syncs completed Telavox calls with transcriptions to HubSpot as CALL engagements.

```typescript
import { syncTelavoxCallToHubSpot } from "@/lib/integrations/workflows/sync-telavox-call-to-hubspot";

const result = await syncTelavoxCallToHubSpot(callSessionId);

if (result.success) {
  console.log(`Synced to HubSpot: ${result.engagementId}`);
}
```

**What it does:**

1. Fetches call session from `telavox_call_sessions`
2. Gets transcription from `transcriptions` table
3. Finds or creates HubSpot contact by phone number
4. Creates CALL engagement with transcript and summary
5. Associates engagement to contact/company
6. Updates call session with HubSpot sync status

**Used by:** `lib/telavox/workers.ts` (hubspot.sync job type)

## Legacy Workflow: syncConversationToHubSpot

> **Note**: For the legacy ElevenLabs architecture (not currently implemented).

Syncs conversations from the `conversations` table to HubSpot.

```typescript
import { syncConversationToHubSpot } from "@/lib/integrations/workflows/sync-conversation-to-hubspot";

const result = await syncConversationToHubSpot(userId, conversationId);
```

**What it does:**

1. Fetches conversation and insights from legacy tables
2. Creates HubSpot contact, deal, and note
3. Creates follow-up task if sentiment is positive
4. Logs to sync history

## Creating New Workflows

```typescript
// lib/integrations/workflows/my-workflow.ts
import * as hubspot from "../hubspot";
import { createServiceClient } from "@/lib/supabase/server";

export async function myNewWorkflow(input: MyInput): Promise<MyResult> {
  const supabase = await createServiceClient();

  // 1. Fetch data
  // 2. Process
  // 3. Sync to external service
  // 4. Update database

  return result;
}
```

## Best Practices

- Handle errors gracefully with meaningful messages
- Use idempotent operations (safe to retry)
- Log operations for audit trail
- Validate inputs before processing
- Return structured results with success/failure status
