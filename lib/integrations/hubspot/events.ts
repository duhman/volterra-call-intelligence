/**
 * HubSpot MCP Server - Events Operations
 * Handle creating event definitions and sending event completions with automatic token management
 */

import { createEventDefinition, sendEventCompletion } from '@/lib/hubspot/client';
import { getValidHubSpotToken } from '@/lib/hubspot/tokenManager';
import type {
  CreateEventDefinitionInput,
  EventDefinitionResponse,
  SendEventCompletionInput,
  EventCompletionResponse,
} from './types';

/**
 * Create a custom event definition in HubSpot
 * Automatically handles token refresh and rate limiting
 * Returns null if token is missing (graceful degradation)
 */
export async function createEventDefinitionOp(
  userId: string,
  input: CreateEventDefinitionInput
): Promise<EventDefinitionResponse | null> {
  const token = await getValidHubSpotToken(userId, { required: false });
  
  if (!token) {
    console.warn(`[HubSpot Events] Token not configured, skipping createEventDefinition for '${input.name}'`);
    return null;
  }
  
  const result = await createEventDefinition(token.access_token, input);
  return result as EventDefinitionResponse;
}

/**
 * Get an event definition by name
 * Returns null if token is missing (graceful degradation)
 */
export async function getEventDefinition(
  userId: string,
  eventName: string
): Promise<EventDefinitionResponse | null> {
  const token = await getValidHubSpotToken(userId, { required: false });
  
  if (!token) {
    console.warn(`[HubSpot Events] Token not configured, skipping getEventDefinition for '${eventName}'`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.hubapi.com/events/v3/event-definitions/${eventName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get event definition: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result as EventDefinitionResponse;
  } catch (error: unknown) {
    console.error('Failed to get event definition:', error);
    throw error;
  }
}

/**
 * Update an event definition (label and description only)
 * Returns null if token is missing (graceful degradation)
 */
export async function updateEventDefinition(
  userId: string,
  eventName: string,
  updates: { label?: string; description?: string }
): Promise<EventDefinitionResponse | null> {
  const token = await getValidHubSpotToken(userId, { required: false });
  
  if (!token) {
    console.warn(`[HubSpot Events] Token not configured, skipping updateEventDefinition for '${eventName}'`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.hubapi.com/events/v3/event-definitions/${eventName}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update event definition: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result as EventDefinitionResponse;
  } catch (error: unknown) {
    console.error('Failed to update event definition:', error);
    throw error;
  }
}

/**
 * Send an event completion to HubSpot
 * Automatically handles token refresh and rate limiting
 * Optionally ensures event definition exists before sending
 */
export async function sendEventCompletionOp(
  userId: string,
  input: SendEventCompletionInput,
  options?: { ensureDefinition?: boolean }
): Promise<EventCompletionResponse> {
  const ensureDefinition = options?.ensureDefinition !== false; // Default to true

  // Check if event definition exists if ensureDefinition is true
  if (ensureDefinition) {
    try {
      const existingDefinition = await getEventDefinition(userId, input.eventName);
      if (!existingDefinition) {
        // Event definition doesn't exist, try to initialize it
        console.log(`Event definition '${input.eventName}' not found, attempting initialization...`);
        try {
          await initializeEventDefinitions(userId);
          // Verify it was created
          const verifyDefinition = await getEventDefinition(userId, input.eventName);
          if (!verifyDefinition) {
            console.warn(`Event definition '${input.eventName}' still not found after initialization attempt`);
          }
        } catch (initError: unknown) {
          console.error(`Failed to initialize event definition '${input.eventName}':`, initError);
          // Continue anyway - will fail with clearer error message below
        }
      }
    } catch (checkError: unknown) {
      console.warn(`Failed to check event definition '${input.eventName}':`, checkError);
      // Continue anyway - will attempt to send and get clearer error if definition missing
    }
  }

  const token = await getValidHubSpotToken(userId, { required: false });
  
  if (!token) {
    console.warn(`[HubSpot Events] Token not configured, skipping sendEventCompletion for '${input.eventName}'`);
    throw new Error(
      `Cannot send event '${input.eventName}': HUBSPOT_PRIVATE_ACCESS_TOKEN not configured. ` +
      `Event tracking is disabled. Configure the token to enable HubSpot event tracking.`
    );
  }
  
  try {
    const result = await sendEventCompletion(token.access_token, input);
    return result as EventCompletionResponse;
  } catch (error: unknown) {
    // Check if error indicates missing event definition
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCodeMatch = errorMessage.match(/status[:\s]+(\d+)/i);
    const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1]) : null;
    
    const isMissingDefinitionError = 
      statusCode === 404 ||
      statusCode === 400 ||
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('event definition') ||
      errorMessage.includes('Unknown event name');

    if (isMissingDefinitionError && ensureDefinition) {
      // Try one more time with initialization
      console.log(`Detected missing event definition error for '${input.eventName}', retrying with initialization...`);
      try {
        await initializeEventDefinitions(userId);
        // Retry sending the event
        const retryResult = await sendEventCompletion(token.access_token, input);
        return retryResult as EventCompletionResponse;
      } catch (retryError: unknown) {
        throw new Error(
          `Failed to send event '${input.eventName}': Event definition does not exist and could not be created. ` +
          `Original error: ${errorMessage}. Initialization error: ${retryError instanceof Error ? retryError.message : String(retryError)}`
        );
      }
    }

    // Re-throw with enhanced error message if it's a definition-related error
    if (isMissingDefinitionError) {
      throw new Error(
        `Failed to send event '${input.eventName}': Event definition does not exist. ` +
        `Please ensure the event definition is created first or enable auto-initialization. ` +
        `Original error: ${errorMessage}`
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Send multiple event completions in bulk
 */
export async function sendBulkEventCompletions(
  userId: string,
  events: SendEventCompletionInput[]
): Promise<EventCompletionResponse[]> {
  const token = await getValidHubSpotToken(userId, { required: false });
  
  if (!token) {
    console.warn(`[HubSpot Events] Token not configured, skipping sendBulkEventCompletions`);
    throw new Error(
      `Cannot send bulk events: HUBSPOT_PRIVATE_ACCESS_TOKEN not configured. ` +
      `Event tracking is disabled. Configure the token to enable HubSpot event tracking.`
    );
  }

  try {
    const response = await fetch('https://api.hubapi.com/events/v3/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send bulk events: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [result];
  } catch (error: unknown) {
    console.error('Failed to send bulk events:', error);
    throw error;
  }
}

/**
 * Initialize event definitions for sales call tracking
 * Idempotent - safe to call multiple times
 * Gracefully degrades if token is missing (returns null results)
 */
export async function initializeEventDefinitions(userId: string): Promise<{
  salesCallInitiated: EventDefinitionResponse | null;
  salesCallCompleted: EventDefinitionResponse | null;
}> {
  const results = {
    salesCallInitiated: null as EventDefinitionResponse | null,
    salesCallCompleted: null as EventDefinitionResponse | null,
  };

  // Check if token is available
  const token = await getValidHubSpotToken(userId, { required: false });
  if (!token) {
    console.warn('[HubSpot Events] Token not configured, skipping event definition initialization');
    return results;
  }

  // Check if sales_call_initiated exists
  try {
    const existingInitiated = await getEventDefinition(userId, 'sales_call_initiated');
    if (existingInitiated) {
      results.salesCallInitiated = existingInitiated;
    } else {
      // Create sales_call_initiated event
      const initiatedDef: CreateEventDefinitionInput = {
        label: 'Sales Call Initiated',
        name: 'sales_call_initiated',
        description: 'Triggered when a sales call is initiated from a Contact or Company view',
        primaryObject: 'CONTACT',
        propertyDefinitions: [
          {
            name: 'agent_id',
            label: 'Agent ID',
            type: 'string',
            description: 'ElevenLabs agent ID used for the call',
          },
          {
            name: 'initiated_from',
            label: 'Initiated From',
            type: 'enumeration',
            options: [
              { label: 'HubSpot Card', value: 'hubspot_card' },
              { label: 'Standalone App', value: 'standalone_app' },
            ],
            description: 'Where the call was initiated from',
          },
          {
            name: 'conversation_id',
            label: 'Conversation ID',
            type: 'string',
            description: 'ElevenLabs conversation ID (set after session starts)',
          },
          {
            name: 'user_email',
            label: 'User Email',
            type: 'string',
            description: 'Sales rep email who initiated the call',
          },
          {
            name: 'session_id',
            label: 'Session ID',
            type: 'string',
            description: 'Unique session identifier for tracking',
          },
          {
            name: 'deal_id',
            label: 'Deal ID',
            type: 'string',
            description: 'Associated deal ID if call initiated from deal',
          },
        ],
        includeDefaultProperties: true,
      };

      const created = await createEventDefinitionOp(userId, initiatedDef);
      if (created) {
        results.salesCallInitiated = created;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Token not configured')) {
      console.warn('[HubSpot Events] Token not configured, event definitions will not be created');
    } else {
      console.error('Failed to initialize sales_call_initiated event:', error);
    }
    // Don't throw - allow graceful degradation
  }

  // Check if sales_call_completed exists
  try {
    const existingCompleted = await getEventDefinition(userId, 'sales_call_completed');
    if (existingCompleted) {
      results.salesCallCompleted = existingCompleted;
    } else {
      // Create sales_call_completed event
      const completedDef: CreateEventDefinitionInput = {
        label: 'Sales Call Completed',
        name: 'sales_call_completed',
        description: 'Triggered when a sales call is completed',
        primaryObject: 'CONTACT',
        propertyDefinitions: [
          {
            name: 'conversation_id',
            label: 'Conversation ID',
            type: 'string',
            description: 'ElevenLabs conversation ID',
          },
          {
            name: 'duration_seconds',
            label: 'Duration (seconds)',
            type: 'number',
            description: 'Call duration in seconds',
          },
          {
            name: 'sentiment',
            label: 'Sentiment',
            type: 'enumeration',
            options: [
              { label: 'Positive', value: 'positive' },
              { label: 'Neutral', value: 'neutral' },
              { label: 'Negative', value: 'negative' },
            ],
            description: 'Overall sentiment of the conversation',
          },
          {
            name: 'transcript_available',
            label: 'Transcript Available',
            type: 'bool',
            description: 'Whether transcript is available',
          },
        ],
        includeDefaultProperties: true,
      };

      const created = await createEventDefinitionOp(userId, completedDef);
      if (created) {
        results.salesCallCompleted = created;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Token not configured')) {
      console.warn('[HubSpot Events] Token not configured, event definitions will not be created');
    } else {
      console.error('Failed to initialize sales_call_completed event:', error);
    }
    // Don't throw - allow graceful degradation
  }

  return results;
}

/**
 * Send an event completion safely with automatic definition initialization
 * Returns success/failure status without throwing errors
 * Use this for non-critical events where failures should be logged but not crash the flow
 */
export async function sendEventCompletionSafe(
  userId: string,
  input: SendEventCompletionInput
): Promise<{ success: boolean; error?: string; response?: EventCompletionResponse }> {
  try {
    const response = await sendEventCompletionOp(userId, input, { ensureDefinition: true });
    return { success: true, response };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log as warning for missing token, error for other issues
    if (errorMessage.includes('Token not configured') || errorMessage.includes('not configured')) {
      console.warn(`[HubSpot Events] Token not configured, skipping event '${input.eventName}'`);
    } else {
      console.error(`Failed to send event '${input.eventName}' safely:`, errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Update sales_call_initiated event with conversation_id
 * Called after conversation starts and we have the conversation_id
 * Note: HubSpot Events API doesn't support updating existing events directly
 * This sends a new event completion with updated conversation_id
 */
export async function updateInitiatedEventWithConversationId(
  userId: string,
  contactId: string,
  sessionId: string,
  conversationId: string
): Promise<void> {
  try {
    // Send updated event with conversation_id
    // The original event will remain, this provides the update
    await sendEventCompletionOp(userId, {
      eventName: 'sales_call_initiated',
      objectId: contactId,
      properties: {
        conversation_id: conversationId,
        session_id: sessionId,
        update_type: 'conversation_started',
      },
    }, { ensureDefinition: true })
  } catch (error: unknown) {
    console.error('Failed to update initiated event with conversation_id:', error)
    // Don't throw - this is a non-critical update
  }
}
