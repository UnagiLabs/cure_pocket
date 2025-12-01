/**
 * Vitest Setup File
 *
 * Loads environment variables from .env and .env.test
 */

import path from "node:path";
import { config } from "dotenv";

// Load .env first (base config)
config({ path: path.resolve(process.cwd(), ".env") });

// Load .env.test (test-specific, overrides .env)
config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
