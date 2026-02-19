#!/usr/bin/env tsx
/**
 * Generate TypeScript types from local Supabase database
 * Run this after migrations to keep types in sync
 */

import { execSync } from "child_process";

const OUTPUT_FILE = "lib/supabase/types.ts";
const SCHEMA = "call_intelligence";

console.log("Checking if Supabase is running...");

try {
  // Check if Supabase is running by trying to connect
  execSync("supabase status", { stdio: "pipe" });
} catch {
  console.error("Supabase is not running. Run `supabase start` first.");
  process.exit(1);
}

console.log("Generating TypeScript types from local database...");

try {
  execSync(
    `supabase gen types typescript --local --schema ${SCHEMA} > ${OUTPUT_FILE}`,
    { stdio: "inherit" },
  );
  console.log(`Types generated successfully: ${OUTPUT_FILE}`);
} catch (error) {
  console.error("Failed to generate types:", error);
  process.exit(1);
}
