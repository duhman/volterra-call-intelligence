import { Client } from "@hubspot/api-client";
import { HUBSPOT_ASSOCIATION_TYPES } from "./constants";

export interface HubSpotError extends Error {
  statusCode?: number;
  message: string;
  isRateLimit?: boolean;
  retryAfter?: number;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is HubSpotError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (error as HubSpotError)?.statusCode === 429 || (error as any)?.status === 429;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const retryableStatusCodes = [429, 502, 503, 504, 408]; // Rate limit, service unavailable, timeout
  const statusCode = (error as HubSpotError)?.statusCode;
  return statusCode
    ? retryableStatusCodes.includes(statusCode)
    : false;
}

/**
 * Extract retry-after delay from error
 */
export function getRetryAfterDelay(error: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retryAfter = (error as HubSpotError)?.retryAfter || (error as any)?.headers?.["retry-after"];
  if (retryAfter) {
    const delayMs = isNaN(Number(retryAfter))
      ? parseInt(String(retryAfter)) * 1000
      : Number(retryAfter) * 1000;
    return delayMs;
  }
  return 0;
}

/**
 * Exponential backoff delay
 */
export function exponentialBackoffDelay(
  attempt: number,
  baseDelay: number = 1000
): number {
  return baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
}

export function getHubSpotClient(accessToken: string) {
  return new Client({
    accessToken,
  });
}

/**
 * Create or update a contact using HubSpot CRM Search API.
 * - If email provided and existing contact found: update it.
 * - Otherwise: create a new contact.
 *
 * Notes:
 * - Uses `crm.contacts.searchApi` per official HubSpot docs.
 * - Avoids incorrect basicApi.getPage filtering.
 */
export async function createOrUpdateContact(
  client: Client,
  data: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    [key: string]: unknown;
  }
) {
  // If we have an email, try to find an existing contact by email
  if (data.email) {
    try {
      const search = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                operator: "EQ" as any,
                value: data.email,
              },
            ],
          },
        ],
        limit: 1,
        properties: ["email"],
      });

      if (search.results && search.results.length > 0) {
        const existing = search.results[0];
        const updated = await client.crm.contacts.basicApi.update(existing.id, {
          properties: data as Record<string, string>,
        });
        return {
          ...updated,
          id: existing.id,
        };
      }
    } catch (error) {
      console.error(
        "Failed to search existing contact by email, falling back to create:",
        error
      );
    }
  }

  // Create new contact
  const created = await client.crm.contacts.basicApi.create({
    properties: data as Record<string, string>,
  });
  return {
    ...created,
    id: created.id,
  };
}

/**
 * Create a new deal in HubSpot.
 * Note: This does NOT perform an "update if exists" check; name retained for backward compatibility.
 */
export async function createOrUpdateDeal(
  client: Client,
  data: {
    dealname: string;
    dealstage?: string;
    amount?: number;
    closedate?: string;
    associatedcontacts?: string[];
    [key: string]: unknown;
  }
) {
  const created = await client.crm.deals.basicApi.create({
    properties: data as Record<string, string>,
  });
  return {
    ...created,
    id: created.id,
  };
}

/**
 * Associate a contact to a deal using the v4 Associations API.
 * Uses the documented typed association instead of hard-coded numeric IDs.
 */
export async function associateContactToDeal(
  client: Client,
  dealId: string,
  contactId: string
) {
  try {
    // Use v4 associations with a semantic type identifier.
    // Adjust "deal_to_contact" if your portal uses a different association type name.
    return await client.crm.associations.v4.basicApi.create(
      "deals",
      dealId,
      "contacts",
      contactId,
       
      [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: HUBSPOT_ASSOCIATION_TYPES.DEAL_TO_CONTACT,
        },
      ] as any
    );
  } catch (error) {
    console.error("Failed to associate contact to deal:", error);
    throw error;
  }
}

export async function createActivity(
  client: Client,
  data: {
    hs_task_type?: string;
    hs_task_status?: string;
    subject?: string;
    body?: string;
    associated_contact_ids?: string[];
    associated_deal_ids?: string[];
  }
) {
  return client.crm.objects.basicApi.create("tasks", {
    properties: data as Record<string, string>,
  });
}

export async function createNote(
  client: Client,
  contactId: string,
  data: {
    hs_note_body: string;
  }
) {
  return client.crm.objects.basicApi.create("notes", {
    properties: data,
    associations: [
      {
        types: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            associationCategory: "HUBSPOT_DEFINED" as any,
            associationTypeId: HUBSPOT_ASSOCIATION_TYPES.NOTE_TO_CONTACT,
          },
        ],
        id: contactId,
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ],
  });
}

/**
 * Create an event definition in HubSpot
 */
export async function createEventDefinition(
  accessToken: string,
  data: {
    label: string;
    name: string;
    description?: string;
    primaryObject: string;
    propertyDefinitions?: Array<{
      name: string;
      label: string;
      type: string;
      options?: Array<{ label: string; value: string }>;
      description?: string;
    }>;
    customMatchingId?: {
      primaryObjectRule: {
        targetObjectPropertyName: string;
        eventPropertyName: string;
      };
    };
    includeDefaultProperties?: boolean;
  }
) {
  const response = await fetch(
    "https://api.hubapi.com/events/v3/event-definitions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to create event definition: ${response.status} - ${error}`
    );
  }

  return response.json();
}

/**
 * Send an event completion to HubSpot
 */
export async function sendEventCompletion(
  accessToken: string,
  data: {
    eventName: string;
    objectId: string;
    occurredAt?: string | number;
    properties?: Record<string, unknown>;
  }
) {
  const payload: Record<string, unknown> = {
    eventName: data.eventName,
    objectId: data.objectId,
  };

  if (data.occurredAt) {
    payload.occurredAt =
      typeof data.occurredAt === "number"
        ? data.occurredAt
        : new Date(data.occurredAt).getTime();
  } else {
    payload.occurredAt = Date.now();
  }

  if (data.properties) {
    payload.properties = data.properties;
  }

  const response = await fetch("https://api.hubapi.com/events/v3/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to send event completion: ${response.status} - ${error}`
    );
  }

  return response.json();
}
