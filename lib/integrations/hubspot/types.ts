/**
 * HubSpot MCP Server - TypeScript Interfaces
 * Shared types for HubSpot operations
 */

// Contact Operations
export interface CreateContactInput {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  [key: string]: unknown;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string;
}

export interface ContactResponse {
  id: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SearchContactsInput {
  query: string;
  limit?: number;
  offset?: number;
}

// Deal Operations
export interface CreateDealInput {
  dealname: string;
  dealstage?: string;
  amount?: number;
  closedate?: string;
  associatedcontacts?: string[];
  [key: string]: unknown;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  id: string;
}

export interface DealResponse {
  id: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

// Note Operations
export interface CreateNoteInput {
  hs_note_body: string;
}

export interface NoteResponse {
  id: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

// Activity Operations
export interface CreateActivityInput {
  hs_task_type?: string;
  hs_task_status?: string;
  subject?: string;
  body?: string;
  associated_contact_ids?: string[];
  associated_deal_ids?: string[];
}

export interface ActivityResponse {
  id: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

// Association Operations
export interface AssociationInput {
  dealId: string;
  contactId: string;
  associationType?: string;
}

// Auth Operations
export interface AuthUrlOptions {
  state?: string;
}

export interface AuthStatusResponse {
  isAuthenticated: boolean;
  expiresAt?: string;
  requiresRefresh?: boolean;
}

// Error Response
export interface HubSpotErrorResponse {
  statusCode: number;
  message: string;
  isRateLimit?: boolean;
  retryAfter?: number;
}

// Event Operations
export interface EventPropertyDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'bool' | 'date' | 'datetime' | 'enumeration';
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface CreateEventDefinitionInput {
  label: string;
  name: string;
  description?: string;
  primaryObject: 'CONTACT' | 'COMPANY' | 'DEAL' | 'TICKET' | string;
  propertyDefinitions?: EventPropertyDefinition[];
  customMatchingId?: {
    primaryObjectRule: {
      targetObjectPropertyName: string;
      eventPropertyName: string;
    };
  };
  includeDefaultProperties?: boolean;
}

export interface EventDefinitionResponse {
  name: string;
  label: string;
  description?: string;
  primaryObject: string;
  propertyDefinitions?: EventPropertyDefinition[];
  [key: string]: unknown;
}

export interface SendEventCompletionInput {
  eventName: string;
  objectId: string;
  occurredAt?: string | number; // ISO 8601 string or epoch milliseconds
  properties?: Record<string, unknown>;
}

export interface EventCompletionResponse {
  eventId?: string;
  status: string;
  [key: string]: unknown;
}

