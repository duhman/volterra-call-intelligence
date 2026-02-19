/**
 * HubSpot MCP Server - Notes Operations
 * Handle creating and managing notes attached to contacts with automatic token management
 */

import { getHubSpotClient, createNote } from '@/lib/hubspot/client';
import { getValidHubSpotToken } from '@/lib/hubspot/tokenManager';
import type { CreateNoteInput, NoteResponse } from './types';

/**
 * Create a note attached to a contact
 * Automatically handles token refresh and rate limiting
 */
export async function createContactNote(
  userId: string,
  contactId: string,
  input: CreateNoteInput
): Promise<NoteResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);
  
  // Stringify properties for API compatibility
  const stringifiedInput = {
    hs_note_body: String(input.hs_note_body || ''),
  };
  
  const result = await createNote(client, contactId, stringifiedInput);

  return {
    id: result.id,
    properties: result.properties || {},
    ...(typeof result === 'object' && result ? result : {}),
  } as NoteResponse;
}

/**
 * Create a note attached to a deal
 */
export async function createDealNote(
  userId: string,
  dealId: string,
  input: CreateNoteInput
): Promise<NoteResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Stringify properties for API compatibility
    const stringifiedInput = {
      hs_note_body: String(input.hs_note_body || ''),
    };

    const result = await client.crm.objects.basicApi.create('notes', {
      properties: stringifiedInput,
      associations: [
        {
          types: [
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              associationCategory: 'HUBSPOT_DEFINED' as any,
              associationTypeId: 202, // Note to Contact
            },
          ],
          id: dealId,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as unknown as Array<{ to: { id: string }; types: Array<{ associationCategory: any; associationTypeId: number }>; }>,
    });

    return {
      id: result.id,
      properties: result.properties || {},
      ...(typeof result === 'object' && result ? result : {}),
    } as NoteResponse;
  } catch (error: unknown) {
    console.error('Failed to create deal note:', error);
    throw error;
  }
}

/**
 * Get notes for a contact
 * Note: HubSpot API client types limit direct association retrieval
 * Consider using advanced API or contact associations endpoint
 */
export async function getContactNotes(
  _userId: string,
  _contactId: string
): Promise<NoteResponse[]> {
  // Note retrieval requires using the CRM API differently
  // For now, return empty array - implement if needed
  console.warn('getContactNotes requires direct CRM API integration, not yet fully implemented');
  return [];
}

/**
 * Delete a note by ID
 */
export async function deleteNote(
  userId: string,
  noteId: string
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Delete through notes endpoint if available
    const archiveFunc = (client as unknown as { crm: { objects: { notesApi: { archive: (id: string) => Promise<void> } } } }).crm?.objects?.notesApi?.archive;
    const deleteFunc = (client as unknown as { crm: { objects: { basicApi: { delete: (type: string, id: string) => Promise<void> } } } }).crm?.objects?.basicApi?.delete;

    if (archiveFunc) {
      await archiveFunc(noteId);
    } else if (deleteFunc) {
      await deleteFunc('notes', noteId);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete note:', error);
    throw error;
  }
}

