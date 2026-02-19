/**
 * HubSpot MCP Server - Deals Operations
 * Handle creating, updating, and managing deals with automatic token management
 */

import { getHubSpotClient, createOrUpdateDeal } from '@/lib/hubspot/client';
import { getValidHubSpotToken } from '@/lib/hubspot/tokenManager';
import type { CreateDealInput, UpdateDealInput, DealResponse } from './types';

/**
 * Create a new deal in HubSpot
 * Automatically handles token refresh and rate limiting
 */
export async function createDeal(
  userId: string,
  input: CreateDealInput
): Promise<DealResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);
  const result = await createOrUpdateDeal(client, input);
  return {
    ...result,
    id: result.id,
    properties: result.properties || {},
  } as DealResponse;
}

/**
 * Update an existing deal
 * Merges provided fields with existing deal data
 */
export async function updateDeal(
  userId: string,
  input: UpdateDealInput
): Promise<DealResponse> {
  const { id, ...updateData } = input;
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Convert all values to strings as HubSpot API expects
    const stringifiedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null) {
        stringifiedData[key] = String(value);
      }
    }

    const result = await client.crm.deals.basicApi.update(id, {
      properties: stringifiedData,
    });
    return {
      id,
      properties: result.properties || {},
      ...(typeof result === 'object' && result ? result : {}),
    } as DealResponse;
  } catch (error: unknown) {
    console.error('Failed to update deal:', error);
    throw error;
  }
}

/**
 * Get a deal by ID
 */
export async function getDeal(
  userId: string,
  dealId: string
): Promise<DealResponse> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    const result = await client.crm.deals.basicApi.getById(dealId);
    return {
      ...result,
      id: dealId,
      properties: result.properties || {},
    } as DealResponse;
  } catch (error: unknown) {
    console.error('Failed to get deal:', error);
    throw error;
  }
}

/**
 * Get all deals for a given user
 */
export async function listDeals(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<DealResponse[]> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // HubSpot API expects string parameters for pagination
    const response = await (client.crm.deals.basicApi as unknown as { getPage: (limit: string, offset: string) => Promise<{ results: Record<string, unknown>[] }> }).getPage(
      String(limit),
      String(offset)
    );
    return (response.results || []).map((deal: Record<string, unknown>) => ({
      id: deal.id as string,
      properties: (deal.properties as Record<string, unknown>) || {},
      ...deal,
    })) as DealResponse[];
  } catch (error: unknown) {
    console.error('Failed to list deals:', error);
    throw error;
  }
}

/**
 * Filter deals by stage
 */
export async function getDealsByStage(
  userId: string,
  stage: string
): Promise<DealResponse[]> {
  const allDeals = await listDeals(userId, 500);
  return allDeals.filter(
    (deal) => deal.properties?.dealstage === stage
  );
}

/**
 * Delete a deal by ID
 * Use with caution - this is a destructive operation
 */
export async function deleteDeal(
  userId: string,
  dealId: string
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Try archive or delete methods
    const archiveFunc = (client.crm.deals.basicApi as unknown as { archive: (id: string) => Promise<void> }).archive;
    const deleteFunc = (client.crm.deals.basicApi as unknown as { delete: (id: string) => Promise<void> }).delete;
    
    if (archiveFunc) {
      await archiveFunc(dealId);
    } else if (deleteFunc) {
      await deleteFunc(dealId);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete deal:', error);
    throw error;
  }
}

