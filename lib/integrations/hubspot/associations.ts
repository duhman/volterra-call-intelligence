/**
 * HubSpot MCP Server - Associations Operations
 * Handle creating and managing associations between HubSpot objects
 */

import { getHubSpotClient, associateContactToDeal } from "@/lib/hubspot/client";
import { getValidHubSpotToken } from "@/lib/hubspot/tokenManager";
import type { AssociationInput } from "./types";

/**
 * Associate a contact to a deal
 * Standard association type: contact_to_deal
 */
export async function associateContact(
  userId: string,
  input: AssociationInput
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // associateContactToDeal now encapsulates the association type using v4 typed associations.
    await associateContactToDeal(client, input.dealId, input.contactId);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to associate contact to deal:", error);
    throw error;
  }
}

/**
 * Get contacts associated with a deal
 * Note: HubSpot API client types limit direct association retrieval
 * Consider using the API's associations endpoint directly
 */
export async function getDealContacts(
  _userId: string,
  _dealId: string
): Promise<Array<{ id: string; properties: Record<string, unknown> }>> {
  // Association retrieval requires using the CRM API differently
  // For now, return empty array - implement if needed
  console.warn(
    "getDealContacts requires direct CRM API integration, not yet fully implemented"
  );
  return [];
}

/**
 * Get deals associated with a contact
 * Note: HubSpot API client types limit direct association retrieval
 * Consider using the API's associations endpoint directly
 */
export async function getContactDeals(
  _userId: string,
  _contactId: string
): Promise<Array<{ id: string; properties: Record<string, unknown> }>> {
  // Association retrieval requires using the CRM API differently
  // For now, return empty array - implement if needed
  console.warn(
    "getContactDeals requires direct CRM API integration, not yet fully implemented"
  );
  return [];
}

/**
 * Remove association between contact and deal
 * Note: Disassociate uses the associationsApi from the main CRM, not objects
 */
export async function disassociateContact(
  userId: string,
  dealId: string,
  contactId: string
): Promise<{ success: boolean }> {
  const token = await getValidHubSpotToken(userId, { required: true });
  if (!token) {
    throw new Error('HubSpot token not available');
  }
  const client = getHubSpotClient(token.access_token);

  try {
    // Use the crm-level associationsApi
    // For disassociation, use the v4 associations API if available.
    const v4Api = (client as unknown as { crm: { associations: { v4: { basicApi: { archive: (from: string, fromId: string, to: string, toId: string) => Promise<void> } } } } }).crm?.associations?.v4?.basicApi;
    const legacyApi = (client as unknown as { crm: { associationsApi: { disassociate: (from: string, fromId: string, to: string, toId: string) => Promise<void> } } }).crm?.associationsApi;

    if (v4Api?.archive) {
      await v4Api.archive(
        "deals",
        dealId,
        "contacts",
        contactId
      );
    } else if (legacyApi?.disassociate) {
      // Fallback for older client shape
      await legacyApi.disassociate(
        "deals",
        dealId,
        "contacts",
        contactId
      );
    } else {
      throw new Error(
        "No supported HubSpot associations API available for disassociate"
      );
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to disassociate contact from deal:", error);
    throw error;
  }
}
