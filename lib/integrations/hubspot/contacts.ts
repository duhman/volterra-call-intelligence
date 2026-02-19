/**
 * HubSpot MCP Server - Contacts Operations
 * Handle creating, updating, and searching contacts with automatic token management
 */

import { getHubSpotClient, createOrUpdateContact } from '@/lib/hubspot/client';
import { getValidHubSpotToken } from '@/lib/hubspot/tokenManager';
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactResponse,
  SearchContactsInput,
} from './types';

/**
 * Create or update a contact in HubSpot
 * Automatically handles token refresh and rate limiting
 */
export async function createContact(
  userId: string,
  input: CreateContactInput
): Promise<ContactResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);
  const result = await createOrUpdateContact(client, input);
  return result as ContactResponse;
}

/**
 * Update an existing contact
 * Merges provided fields with existing contact data
 */
export async function updateContact(
  userId: string,
  input: UpdateContactInput
): Promise<ContactResponse> {
  const { id, ...updateData } = input;
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    const result = await client.crm.contacts.basicApi.update(id, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: updateData as any,
    });
    return {
      ...result,
      id,
      properties: result.properties || {},
    } as ContactResponse;
  } catch (error: unknown) {
    console.error('Failed to update contact:', error);
    throw error;
  }
}

/**
 * Get a contact by ID
 */
export async function getContact(
  userId: string,
  contactId: string
): Promise<ContactResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    const result = await client.crm.contacts.basicApi.getById(contactId);
    return {
      ...result,
      id: contactId,
      properties: result.properties || {},
    } as ContactResponse;
  } catch (error: unknown) {
    console.error('Failed to get contact:', error);
    throw error;
  }
}

/**
 * Search contacts by email or query
 * Useful for finding existing contacts before creating/updating
 */
export async function searchContacts(
  userId: string,
  input: SearchContactsInput
): Promise<ContactResponse[]> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // HubSpot API expects string parameters for pagination
    const response = await (client.crm.contacts.basicApi as unknown as { getPage: (limit: string, offset: string) => Promise<{ results: Record<string, unknown>[] }> }).getPage(
      String(input.limit || 100),
      String(input.offset || 0)
    );

    return (response.results || []).map((contact: Record<string, unknown>) => ({
      id: contact.id as string,
      properties: (contact.properties as Record<string, unknown>) || {},
      ...contact,
    })) as ContactResponse[];
  } catch (error: unknown) {
    console.error('Failed to search contacts:', error);
    throw error;
  }
}

/**
 * Get all contacts for a given user
 */
export async function listContacts(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<ContactResponse[]> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // HubSpot API expects string parameters for pagination
    const response = await (client.crm.contacts.basicApi as unknown as { getPage: (limit: string, offset: string) => Promise<{ results: Record<string, unknown>[] }> }).getPage(
      String(limit),
      String(offset)
    );
    return (response.results || []).map((contact: Record<string, unknown>) => ({
      id: contact.id as string,
      properties: (contact.properties as Record<string, unknown>) || {},
      ...contact,
    })) as ContactResponse[];
  } catch (error: unknown) {
    console.error('Failed to list contacts:', error);
    throw error;
  }
}

/**
 * Delete a contact by ID
 * Use with caution - this is a destructive operation
 */
export async function deleteContact(
  userId: string,
  contactId: string
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Try archive or delete methods
    const archiveFunc = (client.crm.contacts.basicApi as unknown as { archive: (id: string) => Promise<void> }).archive;
    const deleteFunc = (client.crm.contacts.basicApi as unknown as { delete: (id: string) => Promise<void> }).delete;
    
    if (archiveFunc) {
      await archiveFunc(contactId);
    } else if (deleteFunc) {
      await deleteFunc(contactId);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete contact:', error);
    throw error;
  }
}

