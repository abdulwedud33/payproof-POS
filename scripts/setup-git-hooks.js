#!/usr/bin/env node
/**
 * Sets up git pre-commit hook to run the secret scanner before any commit.
 * Enforces SECURITY.md S1 locally.
 */
import fs from 'fs';
import path from 'path';

const gitDir = path.resolve(process.cwd(), '.git');
if (fs.existsSync(gitDir)) {
  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitHook = path.join(hooksDir, 'pre-commit');
  const hookContent = `#!/bin/sh
# PayProof POS pre-commit secret scan
node scripts/scan-secrets.js
if [ $? -ne 0 ]; then
  echo "Commit rejected: secret scanner detected potential secrets or .env file."
  exit 1
fi
`;

  fs.writeFileSync(preCommitHook, hookContent, { mode: 0o755 });
  console.log('✓ Git pre-commit secret scan hook installed successfully.');
} else {
  console.log('No .git directory found. Skipping pre-commit hook installation.');
}
