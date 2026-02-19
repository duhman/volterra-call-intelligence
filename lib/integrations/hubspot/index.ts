/**
 * HubSpot Integration - Main Entry Point
 * Progressive disclosure: Import only what you need from sub-modules
 *
 * High-level usage:
 * import * as hubspot from '@/lib/integrations/hubspot'
 * await hubspot.createContact(userId, data)
 *
 * Or import specific operations:
 * import { createContact, createDeal } from '@/lib/integrations/hubspot/contacts'
 * import { associateContact } from '@/lib/integrations/hubspot/associations'
 */

// Contacts
export {
  createContact,
  updateContact,
  getContact,
  searchContacts,
  listContacts,
  deleteContact,
} from "./contacts";

export type {
  CreateContactInput,
  UpdateContactInput,
  ContactResponse,
  SearchContactsInput,
} from "./types";

// Deals
export {
  createDeal,
  updateDeal,
  getDeal,
  listDeals,
  getDealsByStage,
  deleteDeal,
} from "./deals";

export type { CreateDealInput, UpdateDealInput, DealResponse } from "./types";

// Notes
export {
  createContactNote,
  createDealNote,
  getContactNotes,
  deleteNote,
} from "./notes";

export type { CreateNoteInput, NoteResponse } from "./types";

// Activities
export {
  createTask,
  createContactTask,
  createDealTask,
  createLinkedTask,
  getContactActivities,
  updateActivityStatus,
  deleteActivity,
} from "./activities";

export type { CreateActivityInput, ActivityResponse } from "./types";

// Associations
export {
  associateContact,
  getDealContacts,
  getContactDeals,
  disassociateContact,
} from "./associations";

export type { AssociationInput } from "./types";

// Auth (OAuth deprecated - limited exports retained for status & transition helpers)
export { checkAuthStatus, getAccessToken } from "./auth";

export type { AuthStatusResponse } from "./types";

// Events
export {
  createEventDefinitionOp as createEventDefinition,
  getEventDefinition,
  updateEventDefinition,
  sendEventCompletionOp as sendEventCompletion,
  sendEventCompletionSafe,
  sendBulkEventCompletions,
  initializeEventDefinitions,
  updateInitiatedEventWithConversationId,
} from "./events";

export type {
  CreateEventDefinitionInput,
  EventDefinitionResponse,
  SendEventCompletionInput,
  EventCompletionResponse,
  EventPropertyDefinition,
} from "./types";

// Types
export type { HubSpotErrorResponse } from "./types";
