/**
 * HubSpot API Constants
 * Centralized constants for HubSpot API operations
 */

/**
 * HubSpot Association Type IDs
 * Standard association types used across the platform
 */
export const HUBSPOT_ASSOCIATION_TYPES = {
  // Contact to Deal
  CONTACT_TO_DEAL: 3,
  DEAL_TO_CONTACT: 3, // Same ID, bidirectional

  // Call to Contact
  CALL_TO_CONTACT: 194,
  CONTACT_TO_CALL: 194, // Same ID, bidirectional

  // Call to Deal
  CALL_TO_DEAL: 206,
  DEAL_TO_CALL: 206, // Same ID, bidirectional

  // Note to Contact
  NOTE_TO_CONTACT: 214,
  CONTACT_TO_NOTE: 214, // Same ID, bidirectional
} as const

/**
 * HubSpot Object Types
 */
export const HUBSPOT_OBJECT_TYPES = {
  CONTACTS: 'contacts',
  DEALS: 'deals',
  CALLS: 'calls',
  NOTES: 'notes',
  TASKS: 'tasks',
  COMPANIES: 'companies',
} as const

/**
 * HubSpot Call Disposition IDs
 * Common call disposition values
 */
export const HUBSPOT_CALL_DISPOSITIONS = {
  CONNECTED: 'f240bbac-87c9-4f6e-bf70-924b57d47db7',
  NO_ANSWER: 'a8b0f5a3-1c2d-4e5f-6a7b-8c9d0e1f2a3b',
  BUSY: 'b9c1f6b4-2d3e-5f6a-7b8c-9d0e1f2a3b4c',
  FAILED: 'c0d2f7c5-3e4f-6a7b-8c9d-0e1f2a3b4c5d',
} as const
