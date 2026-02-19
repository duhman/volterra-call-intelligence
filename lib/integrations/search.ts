/**
 * MCP Server Discovery Utility
 * Search and discover available operations without loading full definitions
 * Implements progressive disclosure pattern from Anthropic's code execution with MCP
 */

export interface OperationInfo {
  name: string;
  description: string;
  server: 'hubspot' | 'supabase';
  category: string;
  module: string;
  signature: string;
  detailLevel?: 'name' | 'summary' | 'full';
}

// Operation registry - maps available functions across all servers
const OPERATIONS_REGISTRY: OperationInfo[] = [
  // HubSpot Contacts
  {
    name: 'createContact',
    description: 'Create or update a contact in HubSpot',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature:
      'createContact(userId: string, input: CreateContactInput): Promise<ContactResponse>',
  },
  {
    name: 'updateContact',
    description: 'Update an existing contact',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature:
      'updateContact(userId: string, input: UpdateContactInput): Promise<ContactResponse>',
  },
  {
    name: 'getContact',
    description: 'Get a contact by ID',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature: 'getContact(userId: string, contactId: string): Promise<ContactResponse>',
  },
  {
    name: 'listContacts',
    description: 'List all contacts with pagination',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature:
      'listContacts(userId: string, limit?: number, offset?: number): Promise<ContactResponse[]>',
  },
  {
    name: 'searchContacts',
    description: 'Search contacts by query',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature:
      'searchContacts(userId: string, input: SearchContactsInput): Promise<ContactResponse[]>',
  },
  {
    name: 'deleteContact',
    description: 'Delete a contact (destructive)',
    server: 'hubspot',
    category: 'contacts',
    module: 'lib/mcp-servers/hubspot/contacts',
    signature: 'deleteContact(userId: string, contactId: string): Promise<{ success: boolean }>',
  },

  // HubSpot Deals
  {
    name: 'createDeal',
    description: 'Create a new deal in HubSpot',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'createDeal(userId: string, input: CreateDealInput): Promise<DealResponse>',
  },
  {
    name: 'updateDeal',
    description: 'Update an existing deal',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'updateDeal(userId: string, input: UpdateDealInput): Promise<DealResponse>',
  },
  {
    name: 'getDeal',
    description: 'Get a deal by ID',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'getDeal(userId: string, dealId: string): Promise<DealResponse>',
  },
  {
    name: 'listDeals',
    description: 'List all deals with pagination',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'listDeals(userId: string, limit?: number, offset?: number): Promise<DealResponse[]>',
  },
  {
    name: 'getDealsByStage',
    description: 'Filter deals by stage',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'getDealsByStage(userId: string, stage: string): Promise<DealResponse[]>',
  },
  {
    name: 'deleteDeal',
    description: 'Delete a deal (destructive)',
    server: 'hubspot',
    category: 'deals',
    module: 'lib/mcp-servers/hubspot/deals',
    signature: 'deleteDeal(userId: string, dealId: string): Promise<{ success: boolean }>',
  },

  // HubSpot Notes
  {
    name: 'createContactNote',
    description: 'Create a note attached to a contact',
    server: 'hubspot',
    category: 'notes',
    module: 'lib/mcp-servers/hubspot/notes',
    signature:
      'createContactNote(userId: string, contactId: string, input: CreateNoteInput): Promise<NoteResponse>',
  },
  {
    name: 'createDealNote',
    description: 'Create a note attached to a deal',
    server: 'hubspot',
    category: 'notes',
    module: 'lib/mcp-servers/hubspot/notes',
    signature:
      'createDealNote(userId: string, dealId: string, input: CreateNoteInput): Promise<NoteResponse>',
  },
  {
    name: 'getContactNotes',
    description: 'Get notes for a contact',
    server: 'hubspot',
    category: 'notes',
    module: 'lib/mcp-servers/hubspot/notes',
    signature: 'getContactNotes(userId: string, contactId: string): Promise<NoteResponse[]>',
  },
  {
    name: 'deleteNote',
    description: 'Delete a note by ID',
    server: 'hubspot',
    category: 'notes',
    module: 'lib/mcp-servers/hubspot/notes',
    signature: 'deleteNote(userId: string, noteId: string): Promise<{ success: boolean }>',
  },

  // HubSpot Activities
  {
    name: 'createTask',
    description: 'Create an activity (task) in HubSpot',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'createTask(userId: string, input: CreateActivityInput): Promise<ActivityResponse>',
  },
  {
    name: 'createContactTask',
    description: 'Create a task for a contact',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'createContactTask(userId: string, contactId: string, input: CreateActivityInput)',
  },
  {
    name: 'createDealTask',
    description: 'Create a task for a deal',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'createDealTask(userId: string, dealId: string, input: CreateActivityInput)',
  },
  {
    name: 'createLinkedTask',
    description: 'Create a task linked to contact and deal',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'createLinkedTask(userId: string, contactId: string, dealId: string, input)',
  },
  {
    name: 'getContactActivities',
    description: 'Get activities for a contact',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'getContactActivities(userId: string, contactId: string): Promise<ActivityResponse[]>',
  },
  {
    name: 'updateActivityStatus',
    description: 'Update activity status',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'updateActivityStatus(userId: string, activityId: string, status: string)',
  },
  {
    name: 'deleteActivity',
    description: 'Delete an activity by ID',
    server: 'hubspot',
    category: 'activities',
    module: 'lib/mcp-servers/hubspot/activities',
    signature: 'deleteActivity(userId: string, activityId: string): Promise<{ success: boolean }>',
  },

  // HubSpot Associations
  {
    name: 'associateContact',
    description: 'Associate a contact with a deal',
    server: 'hubspot',
    category: 'associations',
    module: 'lib/mcp-servers/hubspot/associations',
    signature: 'associateContact(userId: string, input: AssociationInput): Promise<{ success: boolean }>',
  },
  {
    name: 'getDealContacts',
    description: 'Get contacts associated with a deal',
    server: 'hubspot',
    category: 'associations',
    module: 'lib/mcp-servers/hubspot/associations',
    signature:
      'getDealContacts(userId: string, dealId: string): Promise<Array<{id, properties}>>',
  },
  {
    name: 'getContactDeals',
    description: 'Get deals associated with a contact',
    server: 'hubspot',
    category: 'associations',
    module: 'lib/mcp-servers/hubspot/associations',
    signature:
      'getContactDeals(userId: string, contactId: string): Promise<Array<{id, properties}>>',
  },
  {
    name: 'disassociateContact',
    description: 'Remove association between contact and deal',
    server: 'hubspot',
    category: 'associations',
    module: 'lib/mcp-servers/hubspot/associations',
    signature:
      'disassociateContact(userId: string, dealId: string, contactId: string): Promise<{ success: boolean }>',
  },

  // HubSpot Auth
  {
    name: 'getAuthUrl',
    description: 'Get HubSpot OAuth authorization URL',
    server: 'hubspot',
    category: 'auth',
    module: 'lib/mcp-servers/hubspot/auth',
    signature: 'getAuthUrl(options?: AuthUrlOptions): Promise<{ url: string; state: string }>',
  },
  {
    name: 'handleOAuthCallback',
    description: 'Handle OAuth callback and exchange code for tokens',
    server: 'hubspot',
    category: 'auth',
    module: 'lib/mcp-servers/hubspot/auth',
    signature:
      'handleOAuthCallback(code: string): Promise<{ access_token, refresh_token, expires_in }>',
  },
  {
    name: 'checkAuthStatus',
    description: 'Check if user has valid HubSpot authentication',
    server: 'hubspot',
    category: 'auth',
    module: 'lib/mcp-servers/hubspot/auth',
    signature: 'checkAuthStatus(userId: string): Promise<AuthStatusResponse>',
  },

  // Supabase Conversations
  {
    name: 'getConversation',
    description: 'Get a conversation from database by ID',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'getConversation(conversationId: string): Promise<Conversation | null>',
  },
  {
    name: 'createConversation',
    description: 'Create a new conversation record in database',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'createConversation(input: ConversationInsert): Promise<Conversation>',
  },
  {
    name: 'updateConversation',
    description: 'Update an existing conversation record',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'updateConversation(conversationId: string, input: ConversationUpdate): Promise<Conversation>',
  },
  {
    name: 'listConversations',
    description: 'List all conversations with filtering and pagination',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'listConversations(input?: ListConversationsInput): Promise<ListResponse<Conversation>>',
  },
  {
    name: 'getUserConversations',
    description: 'Get conversations for a specific user',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature:
      'getUserConversations(userId: string, input?: ListConversationsInput): Promise<ListResponse<Conversation>>',
  },
  {
    name: 'searchConversations',
    description: 'Search conversations by transcript content',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'searchConversations(query: string, limit?: number): Promise<Conversation[]>',
  },
  {
    name: 'getRecentConversations',
    description: 'Get conversations from the last N days',
    server: 'supabase',
    category: 'conversations',
    module: 'lib/mcp-servers/supabase/conversations',
    signature: 'getRecentConversations(days?: number): Promise<Conversation[]>',
  },

  // Supabase Insights
  {
    name: 'getInsights',
    description: 'Get insights for a conversation',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature: 'getInsights(conversationId: string): Promise<Insight | null>',
  },
  {
    name: 'createInsights',
    description: 'Create insights record for a conversation',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature: 'createInsights(input: InsightInsert): Promise<Insight>',
  },
  {
    name: 'getInsightsBySentiment',
    description: 'Filter insights by sentiment (positive, neutral, negative)',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature:
      "getInsightsBySentiment(sentiment: 'positive'|'neutral'|'negative', limit?: number): Promise<Insight[]>",
  },
  {
    name: 'getInsightsByDealStage',
    description: 'Filter insights by deal stage',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature: 'getInsightsByDealStage(dealStage: string, limit?: number): Promise<Insight[]>',
  },
  {
    name: 'getInsightsWithCompetitors',
    description: 'Get insights that mention competitors',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature: 'getInsightsWithCompetitors(limit?: number): Promise<Insight[]>',
  },
  {
    name: 'getSentimentDistribution',
    description: 'Get overall sentiment statistics',
    server: 'supabase',
    category: 'insights',
    module: 'lib/mcp-servers/supabase/insights',
    signature: 'getSentimentDistribution(): Promise<{positive, neutral, negative}>',
  },

  // Supabase Sync Queue
  {
    name: 'getPendingSyncs',
    description: 'Get pending sync items',
    server: 'supabase',
    category: 'sync-queue',
    module: 'lib/mcp-servers/supabase/sync-queue',
    signature:
      'getPendingSyncs(conversationId?: string, limit?: number, offset?: number): Promise<ListResponse<SyncQueueItem>>',
  },
  {
    name: 'getApprovedSyncs',
    description: 'Get approved syncs ready for execution',
    server: 'supabase',
    category: 'sync-queue',
    module: 'lib/mcp-servers/supabase/sync-queue',
    signature: 'getApprovedSyncs(limit?: number): Promise<SyncQueueItem[]>',
  },
  {
    name: 'approveSyncItem',
    description: 'Mark a sync item as approved',
    server: 'supabase',
    category: 'sync-queue',
    module: 'lib/mcp-servers/supabase/sync-queue',
    signature: 'approveSyncItem(itemId: string): Promise<SyncQueueItem>',
  },
  {
    name: 'markSyncComplete',
    description: 'Mark a sync as completed',
    server: 'supabase',
    category: 'sync-queue',
    module: 'lib/mcp-servers/supabase/sync-queue',
    signature: 'markSyncComplete(itemId: string): Promise<SyncQueueItem>',
  },
  {
    name: 'markSyncFailed',
    description: 'Mark a sync as failed with error message',
    server: 'supabase',
    category: 'sync-queue',
    module: 'lib/mcp-servers/supabase/sync-queue',
    signature: 'markSyncFailed(itemId: string, errorMessage: string): Promise<SyncQueueItem>',
  },

  // Supabase Sync History
  {
    name: 'createSyncHistoryRecord',
    description: 'Create a sync history record',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature: 'createSyncHistoryRecord(input: SyncHistoryInsert): Promise<SyncHistoryItem>',
  },
  {
    name: 'getConversationSyncHistory',
    description: 'Get all syncs for a conversation',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature: 'getConversationSyncHistory(conversationId: string, limit?: number): Promise<SyncHistoryItem[]>',
  },
  {
    name: 'getSuccessfulSyncs',
    description: 'Get only successful syncs',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature: 'getSuccessfulSyncs(limit?: number, offset?: number): Promise<ListResponse<SyncHistoryItem>>',
  },
  {
    name: 'getFailedSyncs',
    description: 'Get only failed syncs',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature: 'getFailedSyncs(limit?: number, offset?: number): Promise<ListResponse<SyncHistoryItem>>',
  },
  {
    name: 'getSyncStatistics',
    description: 'Get sync statistics and success rates',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature:
      'getSyncStatistics(): Promise<{total, successful, failed, successRate, byType}>',
  },
  {
    name: 'getConversationSyncedIds',
    description: 'Get all HubSpot IDs synced from a conversation',
    server: 'supabase',
    category: 'sync-history',
    module: 'lib/mcp-servers/supabase/sync-history',
    signature:
      'getConversationSyncedIds(conversationId: string): Promise<{contacts, deals, notes, activities}>',
  },
];

/**
 * Search available MCP operations by query
 * Implements progressive disclosure: returns only what's needed
 */
export async function searchOperations(
  query: string,
  detailLevel: 'name' | 'summary' | 'full' = 'summary'
): Promise<OperationInfo[]> {
  const queryLower = query.toLowerCase();

  // Filter by name, description, category, or module
  const results = OPERATIONS_REGISTRY.filter(
    (op) =>
      op.name.toLowerCase().includes(queryLower) ||
      op.description.toLowerCase().includes(queryLower) ||
      op.category.toLowerCase().includes(queryLower) ||
      op.server.toLowerCase().includes(queryLower)
  );

  // Add detail level
  return results.map((op) => ({
    ...op,
    detailLevel,
  }));
}

/**
 * Get operations by server
 */
export async function getServerOperations(
  server: 'hubspot' | 'supabase'
): Promise<OperationInfo[]> {
  return OPERATIONS_REGISTRY.filter((op) => op.server === server);
}

/**
 * Get operations by category
 */
export async function getOperationsByCategory(
  server: 'hubspot' | 'supabase',
  category: string
): Promise<OperationInfo[]> {
  return OPERATIONS_REGISTRY.filter(
    (op) => op.server === server && op.category === category
  );
}

/**
 * Get all available servers
 */
export async function getAvailableServers(): Promise<string[]> {
  const servers = new Set(OPERATIONS_REGISTRY.map((op) => op.server));
  return Array.from(servers);
}

/**
 * Get categories for a server
 */
export async function getServerCategories(
  server: 'hubspot' | 'supabase'
): Promise<string[]> {
  const categories = new Set(
    OPERATIONS_REGISTRY.filter((op) => op.server === server).map((op) => op.category)
  );
  return Array.from(categories);
}

/**
 * List all operations (for reference/documentation)
 */
export async function listAllOperations(): Promise<OperationInfo[]> {
  return OPERATIONS_REGISTRY;
}

