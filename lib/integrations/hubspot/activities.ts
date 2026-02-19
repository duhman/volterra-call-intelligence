/**
 * HubSpot MCP Server - Activities Operations
 * Handle creating and managing tasks/activities with automatic token management
 */

import { getHubSpotClient, createActivity } from '@/lib/hubspot/client';
import { getValidHubSpotToken } from '@/lib/hubspot/tokenManager';
import type { CreateActivityInput, ActivityResponse } from './types';

/**
 * Create an activity (task) in HubSpot
 * Automatically handles token refresh and rate limiting
 */
export async function createTask(
  userId: string,
  input: CreateActivityInput
): Promise<ActivityResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);
  const result = await createActivity(client, input);

  return {
    ...result,
    id: result.id,
    properties: result.properties || {},
  } as ActivityResponse;
}

/**
 * Create a task for a contact
 */
export async function createContactTask(
  userId: string,
  contactId: string,
  input: Omit<CreateActivityInput, 'associated_contact_ids'>
): Promise<ActivityResponse> {
  return createTask(userId, {
    ...input,
    associated_contact_ids: [contactId],
  });
}

/**
 * Create a task for a deal
 */
export async function createDealTask(
  userId: string,
  dealId: string,
  input: Omit<CreateActivityInput, 'associated_deal_ids'>
): Promise<ActivityResponse> {
  return createTask(userId, {
    ...input,
    associated_deal_ids: [dealId],
  });
}

/**
 * Create a task for both a contact and deal
 */
export async function createLinkedTask(
  userId: string,
  contactId: string,
  dealId: string,
  input: Omit<CreateActivityInput, 'associated_contact_ids' | 'associated_deal_ids'>
): Promise<ActivityResponse> {
  return createTask(userId, {
    ...input,
    associated_contact_ids: [contactId],
    associated_deal_ids: [dealId],
  });
}

/**
 * Get activities for a contact
 * Note: HubSpot API client types limit direct association retrieval
 * Consider fetching through CRM objects API or use list operations instead
 */
export async function getContactActivities(
  _userId: string,
  _contactId: string
): Promise<ActivityResponse[]> {
  // Activity retrieval requires using the CRM API differently
  // For now, return empty array - implement if needed
  console.warn(
    'getContactActivities requires direct CRM API integration, not yet fully implemented'
  );
  return [];
}

/**
 * Update an activity status
 */
export async function updateActivityStatus(
  userId: string,
  activityId: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING'
): Promise<ActivityResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    const result = await client.crm.objects.basicApi.update('tasks', activityId, {
      properties: {
        hs_task_status: status,
      },
    });

    return {
      ...result,
      id: activityId,
      properties: result.properties || {},
    } as ActivityResponse;
  } catch (error: unknown) {
    console.error('Failed to update activity status:', error);
    throw error;
  }
}

/**
 * Delete an activity by ID
 */
export async function deleteActivity(
  userId: string,
  activityId: string
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Delete through tasks endpoint if available
    const tasksApi = (client as unknown as { crm: { objects: { tasksApi: { archive: (id: string) => Promise<void> } } } }).crm?.objects?.tasksApi;
    const basicApi = (client as unknown as { crm: { objects: { basicApi: { delete: (type: string, id: string) => Promise<void> } } } }).crm?.objects?.basicApi;

    if (tasksApi?.archive) {
      await tasksApi.archive(activityId);
    } else if (basicApi?.delete) {
      await basicApi.delete('tasks', activityId);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete activity:', error);
    throw error;
  }
}

