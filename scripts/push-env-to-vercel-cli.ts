#!/usr/bin/env tsx
/**
 * Push environment variables from .env.local to Vercel using CLI
 *
 * Usage:
 *   npx tsx scripts/push-env-to-vercel-cli.ts [environment]
 *
 * Environment options: production, preview, development (default: all)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const PROJECT_ID = "prj_oNR5IJbbqgtxAao6rTzV2eODFKA3";

// Variables to skip (Vercel internal or CLI-specific)
const SKIP_VARS = ["VERCEL_OIDC_TOKEN", "Authorization"];

function parseEnvFile(filePath: string): Map<string, string> {
  const content = readFileSync(filePath, "utf-8");
  const vars = new Map<string, string>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      vars.set(key, value);
    }
  }

  return vars;
}

function addEnvVar(key: string, value: string, target: string): boolean {
  // Vercel CLI syntax: vercel env add [name] [environment]
  const command = `vercel env add ${key} ${target}`;

  try {
    // Pipe the value to stdin
    execSync(command, {
      input: value,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(process.cwd()),
    });

    console.log(`✓ Added/Updated ${key} (${target})`);
    return true;
  } catch (error: any) {
    // If env var exists, try to remove and re-add
    if (
      error.message.includes("already exists") ||
      error.message.includes("409") ||
      error.message.includes("Environment Variable already exists")
    ) {
      try {
        // Remove first, then add
        const rmCommand = `vercel env rm ${key} ${target} --yes`;
        execSync(rmCommand, {
          stdio: "ignore",
          cwd: join(process.cwd()),
        });
        execSync(command, {
          input: value,
          stdio: ["pipe", "pipe", "pipe"],
          cwd: join(process.cwd()),
        });
        console.log(`✓ Updated ${key} (${target})`);
        return true;
      } catch (e) {
        console.error(`✗ Failed to update ${key}: ${error.message}`);
        return false;
      }
    }
    console.error(`✗ Failed to add ${key}: ${error.message}`);
    return false;
  }
}

async function main() {
  const envArg = process.argv[2] as
    | "production"
    | "preview"
    | "development"
    | undefined;

  // Determine target environments
  const targets: string[] = envArg
    ? [envArg]
    : ["production", "preview", "development"];

  console.log(`Pushing env vars to Vercel project ${PROJECT_ID}...`);
  console.log(`Target environments: ${targets.join(", ")}\n`);

  // Verify Vercel CLI is authenticated
  try {
    execSync("vercel whoami", { stdio: "pipe" });
  } catch (e) {
    console.error(
      "Error: Vercel CLI not authenticated. Run `vercel login` first.",
    );
    process.exit(1);
  }

  // Parse .env.local
  const envPath = join(process.cwd(), ".env.local");
  const envVars = parseEnvFile(envPath);

  console.log(`Found ${envVars.size} variables in .env.local\n`);

  // Push each variable to each target
  let success = 0;
  let skipped = 0;

  for (const [key, value] of envVars.entries()) {
    if (SKIP_VARS.includes(key)) {
      console.log(`⊘ Skipped ${key} (internal variable)`);
      skipped++;
      continue;
    }

    for (const target of targets) {
      if (addEnvVar(key, value, target)) {
        success++;
      }
    }
  }

  console.log(`\n✓ Successfully pushed ${success} variable assignments`);
  if (skipped > 0) {
    console.log(`⊘ Skipped ${skipped} internal variables`);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
