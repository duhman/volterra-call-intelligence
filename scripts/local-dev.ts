#!/usr/bin/env tsx
/**
 * Start local Supabase (if needed) and sync types.
 * Use for one-command local dev bootstrap.
 */

import { execSync } from "child_process";

function isSupabaseRunning(): boolean {
  try {
    execSync("supabase status", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(command: string) {
  execSync(command, { stdio: "inherit" });
}

if (!isSupabaseRunning()) {
  console.log("Supabase not running. Starting local stack...");
  run("supabase start");
} else {
  console.log("Supabase running. Skipping start.");
}

console.log("Generating types from local database...");
run("npm run db:types");
