import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local (test uses same Supabase as dev)
config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create client if we have credentials
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { db: { schema: 'call_intelligence' } })
  : null;

export interface TestCall {
  id?: string;
  from_number: string;
  to_number: string;
  agent_email: string;
  direction: 'inbound' | 'outbound';
  duration_seconds: number;
  telavox_recording_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  webhook_timestamp: string;
}

export interface TestTranscription {
  id?: string;
  call_id: string;
  full_text: string;
  speaker_labels?: any;
  elevenlabs_request_id?: string;
}

export interface TestSetting {
  key: string;
  value: string;
}

export interface TestWebhookLog {
  id?: string;
  event_type: string;
  payload: any;
  source_ip: string;
  processed: boolean;
  error_message?: string;
}

export interface TestApiKey {
  id?: string;
  agent_email: string;
  display_name: string;
  api_key: string;
  hubspot_user_id?: string;
}

export interface TestBlockedNumber {
  id?: string;
  phone_number: string;
  reason: string;
  created_at: string;
}

// Test data factory functions
export function createTestCall(overrides: Partial<TestCall> = {}): TestCall {
  return {
    from_number: '+46123456789',
    to_number: '+46987654321',
    agent_email: 'test@example.com',
    direction: 'inbound',
    duration_seconds: 300,
    telavox_recording_id: 'test_recording_123',
    status: 'pending',
    webhook_timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestTranscription(callId: string, overrides: Partial<TestTranscription> = {}): TestTranscription {
  return {
    call_id: callId,
    full_text: 'This is a test transcription',
    speaker_labels: { speaker_0: ['0-5'], speaker_1: ['6-10'] },
    elevenlabs_request_id: 'test_request_123',
    ...overrides,
  };
}

export function createTestSetting(key: string, value: string): TestSetting {
  return { key, value };
}

export function createTestWebhookLog(overrides: Partial<TestWebhookLog> = {}): TestWebhookLog {
  return {
    event_type: 'hangup',
    payload: { test: true },
    source_ip: '127.0.0.1',
    processed: false,
    ...overrides,
  };
}

export function createTestApiKey(overrides: Partial<TestApiKey> = {}): TestApiKey {
  return {
    agent_email: 'test@example.com',
    display_name: 'Test Agent',
    api_key: 'test_api_key_123',
    hubspot_user_id: 'test_user_123',
    ...overrides,
  };
}

export function createTestBlockedNumber(phoneNumber: string, reason: string = 'Test block'): TestBlockedNumber {
  return {
    phone_number: phoneNumber,
    reason,
    created_at: new Date().toISOString(),
  };
}

// Database operations for tests (all return mock data if supabase is not available)
// Note: RLS policies may prevent select after insert; we handle this gracefully
export async function insertTestCall(call: TestCall): Promise<TestCall> {
  if (!supabase) return { ...call, id: `mock-call-${Date.now()}` };
  const { data, error } = await supabase.from('calls').insert(call).select();
  if (error) { console.error('insertTestCall error:', error); throw error; }
  return data?.[0] || { ...call, id: `fallback-${Date.now()}` };
}

export async function insertTestTranscription(transcription: TestTranscription): Promise<TestTranscription> {
  if (!supabase) return { ...transcription, id: `mock-transcription-${Date.now()}` };
  const { data, error } = await supabase.from('transcriptions').insert(transcription).select();
  if (error) { console.error('insertTestTranscription error:', error); throw error; }
  return data?.[0] || { ...transcription, id: `fallback-${Date.now()}` };
}

export async function insertTestSetting(setting: TestSetting): Promise<TestSetting> {
  if (!supabase) return setting;
  // Use upsert for settings since key is unique
  const { data, error } = await supabase.from('settings').upsert(setting, { onConflict: 'key' }).select();
  if (error) { console.error('insertTestSetting error:', error); throw error; }
  return data?.[0] || setting;
}

export async function insertTestWebhookLog(log: TestWebhookLog): Promise<TestWebhookLog> {
  if (!supabase) return { ...log, id: `mock-log-${Date.now()}` };
  const { data, error } = await supabase.from('webhook_logs').insert(log).select();
  if (error) { console.error('insertTestWebhookLog error:', error); throw error; }
  return data?.[0] || { ...log, id: `fallback-${Date.now()}` };
}

export async function insertTestApiKey(apiKey: TestApiKey): Promise<TestApiKey> {
  if (!supabase) return { ...apiKey, id: `mock-apikey-${Date.now()}` };
  // Use upsert for api keys since agent_email is unique
  const { data, error } = await supabase.from('telavox_api_keys').upsert(apiKey, { onConflict: 'agent_email' }).select();
  if (error) { console.error('insertTestApiKey error:', error); throw error; }
  return data?.[0] || { ...apiKey, id: `fallback-${Date.now()}` };
}

export async function insertTestBlockedNumber(blockedNumber: TestBlockedNumber): Promise<TestBlockedNumber> {
  if (!supabase) return { ...blockedNumber, id: `mock-blocked-${Date.now()}` };
  const { data, error } = await supabase.from('blocked_numbers').insert(blockedNumber).select();
  if (error) { console.error('insertTestBlockedNumber error:', error); throw error; }
  return data?.[0] || { ...blockedNumber, id: `fallback-${Date.now()}` };
}

// Cleanup functions
export async function cleanupTestData() {
  if (!supabase) {
    console.log('Skipping cleanup - no Supabase client');
    return;
  }
  
  const testPrefix = 'test_';
  
  await supabase.from('calls').delete()
    .or(`from_number.like.%${testPrefix}%,to_number.like.%${testPrefix}%,telavox_recording_id.like.%${testPrefix}%`);
  await supabase.from('transcriptions').delete()
    .or(`full_text.like.%This is a test%,elevenlabs_request_id.like.%${testPrefix}%`);
  await supabase.from('settings').delete().like('key', `${testPrefix}%`);
  await supabase.from('webhook_logs').delete()
    .or('payload->>test.eq.true,source_ip.eq.127.0.0.1');
  await supabase.from('telavox_api_keys').delete()
    .or('api_key.like.%test_%,agent_email.like.%test%');
  await supabase.from('blocked_numbers').delete().like('reason', 'Test block%');
}

// Seed test data
export async function seedTestData() {
  if (!supabase) {
    console.log('Skipping seed - no Supabase client');
    return;
  }
  
  console.log('Seeding test data...');
  
  await insertTestSetting('test_transcribe_unknown_numbers', 'true');
  await insertTestSetting('test_auto_sync_hubspot', 'false');
  
  const call1 = await insertTestCall({
    ...createTestCall(),
    from_number: '+46123456789',
    status: 'completed',
  });
  
  await insertTestCall({
    ...createTestCall(),
    from_number: '+46123456780',
    status: 'processing',
  });
  
  await insertTestTranscription({
    ...createTestTranscription(call1.id!),
    full_text: 'Test call transcription 1',
  });
  
  await insertTestWebhookLog({
    ...createTestWebhookLog(),
    event_type: 'hangup',
    processed: true,
  });
  
  await insertTestApiKey({
    ...createTestApiKey(),
    api_key: 'test_api_key_123',
  });
  
  await insertTestBlockedNumber('+46000000000', 'Test spam number');
  
  console.log('Test data seeded successfully');
}

// Export supabase client for direct test usage
export { supabase as testSupabase };
