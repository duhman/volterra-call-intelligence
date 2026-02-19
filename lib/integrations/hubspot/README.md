# HubSpot Integration

Progressive disclosure API for HubSpot CRM operations using a single private app access token (no per-user OAuth). Provides rate limiting resilience and structured helpers for common CRM tasks.

## Quick Start

```typescript
import * as hubspot from "@/lib/integrations/hubspot";

const userId = "user-123";

// Create a contact
const contact = await hubspot.createContact(userId, {
  email: "john@example.com",
  firstname: "John",
  lastname: "Doe",
  phone: "555-1234",
});

// Create a deal and associate contact
const deal = await hubspot.createDeal(userId, {
  dealname: "Enterprise Package",
  dealstage: "Proposal",
  amount: 50000,
});

await hubspot.associateContact(userId, {
  dealId: deal.id,
  contactId: contact.id,
});

// Add a note
await hubspot.createContactNote(userId, contact.id, {
  hs_note_body: "Follow up next week regarding pricing concerns",
});

// Create a task
await hubspot.createLinkedTask(userId, contact.id, deal.id, {
  subject: "Schedule demo",
  hs_task_status: "NOT_STARTED",
});
```

## Contacts API

### createContact(userId, input)

Create or update a contact in HubSpot.

```typescript
const contact = await hubspot.createContact(userId, {
  email: "john@example.com",
  firstname: "John",
  lastname: "Doe",
  phone: "555-1234",
  company: "Acme Corp",
});
```

**Returns:** `ContactResponse` with `id` and `properties`

### updateContact(userId, input)

Update an existing contact.

```typescript
const updated = await hubspot.updateContact(userId, {
  id: "contact-123",
  phone: "555-5678",
  company: "Acme Corp Inc",
});
```

### getContact(userId, contactId)

Get a contact by ID.

```typescript
const contact = await hubspot.getContact(userId, "contact-123");
```

### listContacts(userId, limit, offset)

List all contacts with pagination.

```typescript
const contacts = await hubspot.listContacts(userId, 100, 0);
```

### searchContacts(userId, input)

Search contacts by query.

```typescript
const results = await hubspot.searchContacts(userId, {
  query: "john@example.com",
  limit: 10,
});
```

### deleteContact(userId, contactId)

Delete a contact (destructive).

```typescript
await hubspot.deleteContact(userId, "contact-123");
```

## Deals API

### createDeal(userId, input)

Create a new deal.

```typescript
const deal = await hubspot.createDeal(userId, {
  dealname: "Enterprise Package",
  dealstage: "Proposal",
  amount: 50000,
  closedate: "2024-12-31",
});
```

**Returns:** `DealResponse` with `id` and `properties`

### updateDeal(userId, input)

Update an existing deal.

```typescript
const updated = await hubspot.updateDeal(userId, {
  id: "deal-123",
  dealstage: "Negotiation",
  amount: 60000,
});
```

### getDeal(userId, dealId)

Get a deal by ID.

```typescript
const deal = await hubspot.getDeal(userId, "deal-123");
```

### listDeals(userId, limit, offset)

List all deals with pagination.

```typescript
const deals = await hubspot.listDeals(userId, 100, 0);
```

### getDealsByStage(userId, stage)

Filter deals by stage.

```typescript
const proposals = await hubspot.getDealsByStage(userId, "Proposal");
```

### deleteDeal(userId, dealId)

Delete a deal (destructive).

```typescript
await hubspot.deleteDeal(userId, "deal-123");
```

## Notes API

### createContactNote(userId, contactId, input)

Create a note attached to a contact.

```typescript
const note = await hubspot.createContactNote(userId, "contact-123", {
  hs_note_body: "Customer expressed interest in advanced features",
});
```

### createDealNote(userId, dealId, input)

Create a note attached to a deal.

```typescript
const note = await hubspot.createDealNote(userId, "deal-123", {
  hs_note_body: "Waiting for customer approval on contract",
});
```

### getContactNotes(userId, contactId)

Get all notes for a contact.

```typescript
const notes = await hubspot.getContactNotes(userId, "contact-123");
```

### deleteNote(userId, noteId)

Delete a note.

```typescript
await hubspot.deleteNote(userId, "note-123");
```

## Activities API

### createTask(userId, input)

Create a task/activity.

```typescript
const task = await hubspot.createTask(userId, {
  subject: "Follow up call",
  hs_task_status: "NOT_STARTED",
  hs_task_type: "CALL",
});
```

### createContactTask(userId, contactId, input)

Create a task for a specific contact.

```typescript
const task = await hubspot.createContactTask(userId, "contact-123", {
  subject: "Send proposal",
  hs_task_status: "NOT_STARTED",
});
```

### createDealTask(userId, dealId, input)

Create a task for a specific deal.

```typescript
const task = await hubspot.createDealTask(userId, "deal-123", {
  subject: "Arrange meeting",
  hs_task_status: "NOT_STARTED",
});
```

### createLinkedTask(userId, contactId, dealId, input)

Create a task linked to both contact and deal.

```typescript
const task = await hubspot.createLinkedTask(userId, "contact-123", "deal-123", {
  subject: "Follow up on pricing",
  hs_task_status: "NOT_STARTED",
});
```

### getContactActivities(userId, contactId)

Get all activities for a contact.

```typescript
const activities = await hubspot.getContactActivities(userId, "contact-123");
```

### updateActivityStatus(userId, activityId, status)

Update an activity's status.

```typescript
await hubspot.updateActivityStatus(userId, "task-123", "COMPLETED");
```

Valid statuses: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `WAITING`

### deleteActivity(userId, activityId)

Delete an activity.

```typescript
await hubspot.deleteActivity(userId, "task-123");
```

## Associations API

### associateContact(userId, input)

Associate a contact with a deal.

```typescript
await hubspot.associateContact(userId, {
  dealId: "deal-123",
  contactId: "contact-123",
});
```

### getDealContacts(userId, dealId)

Get all contacts associated with a deal.

```typescript
const contacts = await hubspot.getDealContacts(userId, "deal-123");
```

### getContactDeals(userId, contactId)

Get all deals associated with a contact.

```typescript
const deals = await hubspot.getContactDeals(userId, "contact-123");
```

### disassociateContact(userId, dealId, contactId)

Remove association between contact and deal.

```typescript
await hubspot.disassociateContact(userId, "deal-123", "contact-123");
```

## Authentication Model

This server now uses a single HubSpot Private App access token supplied via the `HUBSPOT_PRIVATE_ACCESS_TOKEN` environment variable. All legacy OAuth flows, state validation, and token refresh logic have been removed.

Helpers:

- `checkAuthStatus(userId)` – returns `{ isAuthenticated: boolean }` indicating whether the env token is present.
- `getAccessToken()` – returns `{ access_token: string }` for direct API calls when needed.

If the environment token is absent, functions will throw early to surface misconfiguration.

## Error Handling

All operations throw errors with context:

```typescript
try {
  await hubspot.createContact(userId, input);
} catch (error: any) {
  if (error.statusCode === 429) {
    console.log("Rate limit exceeded");
  } else if (error.statusCode === 401) {
    console.log("Authentication required");
  } else {
    console.error("Error:", error.message);
  }
}
```

## Features

- **Single Token Simplicity**: No per-user OAuth – private app access token only
- **Resilient Rate Limiting**: Exponential backoff for retryable errors (429, 5xx, timeouts)
- **Type Safety**: Full TypeScript support with interfaces for all operations
- **Progressive Disclosure**: Import only what you need
- **Consistent Error Handling**: Structured error contexts for troubleshooting

## Common Patterns

### Complete Sync Workflow

```typescript
// Create contact and deal, link them, add note
const contact = await hubspot.createContact(userId, contactData);
const deal = await hubspot.createDeal(userId, dealData);

await hubspot.associateContact(userId, {
  dealId: deal.id,
  contactId: contact.id,
});

await hubspot.createContactNote(userId, contact.id, {
  hs_note_body: `Call summary: ${summary}`,
});
```

### Batch Operations

```typescript
// Create multiple contacts efficiently
const contacts = await Promise.all(
  contactsData.map((data) => hubspot.createContact(userId, data))
);
```

### Filter and Transform

```typescript
// Get deals in specific stage and extract key info
const proposals = await hubspot.getDealsByStage(userId, "Proposal");
const amounts = proposals.map((deal) => deal.properties.amount);
```

## Best Practices

1. **Always pass userId**: Signature retained for compatibility (userId is ignored for auth)
2. **Handle errors**: Wrap operations in try-catch for production code
3. **Use promises.all()**: For multiple independent operations
4. **Verify configuration**: Ensure `HUBSPOT_PRIVATE_ACCESS_TOKEN` is set at startup
5. **Reuse results**: Store contact/deal IDs to avoid repeated lookups
