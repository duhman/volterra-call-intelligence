#!/usr/bin/env tsx
/**
 * Push environment variables from .env.local to Vercel project
 *
 * Usage:
 *   npx tsx scripts/push-env-to-vercel.ts [environment]
 *
 * Environment options: production, preview, development (default: all)
 */

import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ID = "prj_oNR5IJbbqgtxAao6rTzV2eODFKA3";
const VERCEL_API_BASE = "https://api.vercel.com";

// Variables to skip (Vercel internal or CLI-specific)
const SKIP_VARS = [
  "VERCEL_OIDC_TOKEN",
  "Authorization", // CLI auth header
];

interface EnvVar {
  key: string;
  value: string;
  target: ("production" | "preview" | "development")[];
}

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

async function getVercelToken(): Promise<string> {
  // Try VERCEL_TOKEN env var first
  if (process.env.VERCEL_TOKEN) {
    return process.env.VERCEL_TOKEN;
  }

  // Try reading from Vercel CLI config
  try {
    const os = await import("os");
    const configPath = join(os.homedir(), ".vercel", "auth.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    if (config.token) {
      return config.token;
    }
  } catch (e) {
    // Config file doesn't exist or invalid
  }

  throw new Error(
    "Vercel token not found.\n" +
      "Options:\n" +
      "  1. Set VERCEL_TOKEN env var: export VERCEL_TOKEN=your_token\n" +
      "  2. Get token from: https://vercel.com/account/tokens\n" +
      "  3. Or use: npx tsx scripts/push-env-to-vercel-cli.ts (CLI-based, slower)",
  );
}

async function getTeamId(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${VERCEL_API_BASE}/v2/teams`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const teams = data.teams || [];

    // Try to find "volterra" team (from project context)
    const volterraTeam = teams.find(
      (t: any) => t.name === "volterra" || t.slug === "volterra",
    );

    return volterraTeam?.id || teams[0]?.id || null;
  } catch (e) {
    return null;
  }
}

async function listExistingEnvVars(
  token: string,
  teamId: string | null,
): Promise<Map<string, any>> {
  const url = teamId
    ? `${VERCEL_API_BASE}/v10/projects/${PROJECT_ID}/env?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v10/projects/${PROJECT_ID}/env`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list env vars: ${response.statusText}`);
  }

  const data = await response.json();
  const existing = new Map();

  for (const env of data.envs || []) {
    existing.set(env.key, env);
  }

  return existing;
}

async function createOrUpdateEnvVar(
  token: string,
  teamId: string | null,
  envVar: EnvVar,
  existing: Map<string, any>,
): Promise<void> {
  const existingVar = existing.get(envVar.key);
  const url = teamId
    ? `${VERCEL_API_BASE}/v10/projects/${PROJECT_ID}/env${existingVar ? `/${existingVar.id}` : ""}?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v10/projects/${PROJECT_ID}/env${existingVar ? `/${existingVar.id}` : ""}`;

  const method = existingVar ? "PATCH" : "POST";
  const body: any = {
    key: envVar.key,
    value: envVar.value,
    type: "encrypted",
    target: envVar.target,
  };

  if (existingVar) {
    // PATCH only needs changed fields
    body.target = envVar.target;
    body.value = envVar.value;
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to ${method === "POST" ? "create" : "update"} ${envVar.key}: ${error}`,
    );
  }

  console.log(
    `✓ ${method === "POST" ? "Created" : "Updated"} ${envVar.key} (${envVar.target.join(", ")})`,
  );
}

async function main() {
  const envArg = process.argv[2] as
    | "production"
    | "preview"
    | "development"
    | undefined;

  // Determine target environments
  const targets: ("production" | "preview" | "development")[] = envArg
    ? [envArg]
    : ["production", "preview", "development"];

  console.log(`Pushing env vars to Vercel project ${PROJECT_ID}...`);
  console.log(`Target environments: ${targets.join(", ")}\n`);

  // Parse .env.local
  const envPath = join(process.cwd(), ".env.local");
  const envVars = parseEnvFile(envPath);

  console.log(`Found ${envVars.size} variables in .env.local\n`);

  // Get Vercel token
  const token = await getVercelToken();
  const teamId = await getTeamId(token);

  if (teamId) {
    console.log(`Using team ID: ${teamId}\n`);
  }

  // Get existing env vars
  const existing = await listExistingEnvVars(token, teamId);
  console.log(`Found ${existing.size} existing environment variables\n`);

  // Push each variable
  let success = 0;
  let skipped = 0;

  for (const [key, value] of envVars.entries()) {
    if (SKIP_VARS.includes(key)) {
      console.log(`⊘ Skipped ${key} (internal variable)`);
      skipped++;
      continue;
    }

    try {
      await createOrUpdateEnvVar(
        token,
        teamId,
        { key, value, target: targets },
        existing,
      );
      success++;
    } catch (error: any) {
      console.error(`✗ Failed to push ${key}: ${error.message}`);
    }
  }

  console.log(`\n✓ Successfully pushed ${success} variables`);
  if (skipped > 0) {
    console.log(`⊘ Skipped ${skipped} internal variables`);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
