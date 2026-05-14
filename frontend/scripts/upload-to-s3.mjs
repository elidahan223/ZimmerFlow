#!/usr/bin/env node
/**
 * Uploads frontend/dist to S3 bucket.
 * Run after `npm run build`.
 *
 * Uses AWS credentials from backend/.env (so we don't keep two copies).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FRONTEND_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(FRONTEND_ROOT, '..')

// Load credentials from backend/.env
config({ path: resolve(REPO_ROOT, 'backend', '.env'), quiet: true })

const BUCKET = process.env.FRONTEND_BUCKET || 'biktothazhav-frontend'
const REGION = process.env.FRONTEND_BUCKET_REGION || 'eu-central-1'
const DIST_DIR = resolve(FRONTEND_ROOT, 'dist')

const s3 = new S3Client({ region: REGION })

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/octet-stream',
}

// Hashed assets get long cache; html gets no-cache so updates show immediately.
function cacheControlFor(key) {
  if (key === 'index.html' || key.endsWith('/index.html')) {
    return 'no-cache, no-store, must-revalidate'
  }
  if (key.startsWith('assets/')) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else yield full
  }
}

async function listExistingKeys() {
  const keys = []
  let token
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }))
    res.Contents?.forEach((o) => keys.push(o.Key))
    token = res.NextContinuationToken
  } while (token)
  return keys
}

async function main() {
  try {
    statSync(DIST_DIR)
  } catch {
    console.error(`✗ ${DIST_DIR} not found — run "npm run build" first.`)
    process.exit(1)
  }

  console.log(`→ Uploading dist/ to s3://${BUCKET} (region: ${REGION})`)

  const localFiles = [...walk(DIST_DIR)].map((abs) => ({
    abs,
    key: relative(DIST_DIR, abs).replace(/\\/g, '/'),
  }))

  for (const { abs, key } of localFiles) {
    const body = readFileSync(abs)
    const ext = extname(key).toLowerCase()
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControlFor(key),
    }))
    console.log(`  ✓ ${key}  (${body.length} bytes)`)
  }

  // Clean up stale files that are no longer in dist/
  const remoteKeys = await listExistingKeys()
  const localKeySet = new Set(localFiles.map((f) => f.key))
  const stale = remoteKeys.filter((k) => !localKeySet.has(k))
  for (const key of stale) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    console.log(`  − removed stale: ${key}`)
  }

  console.log(`✓ Uploaded ${localFiles.length} file(s). Stale removed: ${stale.length}.`)
}

main().catch((err) => {
  console.error('✗ Upload failed:', err)
  process.exit(1)
})
