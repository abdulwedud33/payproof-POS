#!/usr/bin/env node
/**
 * Cross-platform secret and security scanner for PayProof POS.
 * Enforces SECURITY.md rules:
 * - S1: No secrets or keys in client code, bundles, or repository
 * - Blocks forbidden patterns, private keys, live tokens, and uncommitted .env files
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
  { name: 'Private Key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: 'Generic API Secret assignment',
    regex: /(?:api[_-]?key|secret|password|auth_token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i,
  },
  {
    name: 'JWT Secret hardcoded string',
    regex: /JWT_(?:ACCESS|REFRESH)_SECRET\s*=\s*['"][^'"]+['"]/i,
  },
  {
    name: 'Postgres password with live credential',
    regex: /postgres:\/\/(?!app_api:CHANGE_ME|migrator:CHANGE_ME|postgres:postgres)[^:]+:[^@]+@/i,
  },
  { name: 'AWS/Cloud Secret Key pattern', regex: /(?:AKIA[0-9A-Z]{16}|aws_secret_access_key)/i },
];

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.env.example',
  'scripts/scan-secrets.js',
  '.gitleaks.toml',
];

let violations = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    if (
      file === 'node_modules' ||
      file === '.git' ||
      file === 'dist' ||
      file === 'build' ||
      file === '.turbo' ||
      file === 'coverage' ||
      IGNORED_PATHS.some(
        (ignored) =>
          relPath === ignored ||
          relPath.startsWith(ignored + '/') ||
          relPath.includes('/node_modules/') ||
          relPath.includes('/.git/')
      )
    ) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else {
      // Check .env files that are not .env.example
      if (file.startsWith('.env') && file !== '.env.example') {
        console.error(`[SECRET SCAN FAIL] Real environment file detected: ${relPath}`);
        violations++;
      }

      // Check file content
      if (stat.size < 1024 * 1024) {
        // Only scan files under 1MB
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.regex.test(content)) {
              console.error(`[SECRET SCAN FAIL] ${pattern.name} detected in ${relPath}`);
              violations++;
            }
          }
        } catch (e) {
          // ignore binary files or read errors
        }
      }
    }
  }
}

console.log('Running PayProof POS Secret Scanner...');
walk(process.cwd());

if (violations > 0) {
  console.error(`\nSecret scan FAILED with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log('Secret scan PASSED: 0 violations found.\n');
  process.exit(0);
}
