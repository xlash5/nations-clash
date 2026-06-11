import { readdirSync, statSync, existsSync } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { createReadStream, createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const pipe = promisify(pipeline)

const CLIENT_JS_LIMIT = 500 * 1024 // 500 KB
const SERVER_JS_LIMIT = 2 * 1024 * 1024 // 2 MB

async function gzipSize(filePath) {
  const tmpFile = join(tmpdir(), `gz-check-${randomBytes(4).toString('hex')}.gz`)
  await pipe(
    createReadStream(filePath),
    createGzip(),
    createWriteStream(tmpFile),
  )
  const size = statSync(tmpFile).size
  return size
}

function getJsFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(f => join(dir, f))
}

async function main() {
  let failed = false

  // Check client bundle
  const clientAssets = join('client', 'dist', 'assets')
  const clientFiles = getJsFiles(clientAssets)
  let clientTotal = 0
  for (const f of clientFiles) {
    clientTotal += await gzipSize(f)
  }
  console.log(`Client JS bundle (gzipped): ${(clientTotal / 1024).toFixed(1)} KB`)
  if (clientTotal > CLIENT_JS_LIMIT) {
    console.error(`FAIL: Client bundle ${clientTotal} bytes exceeds limit of ${CLIENT_JS_LIMIT} bytes`)
    failed = true
  } else {
    console.log(`PASS: Client bundle (${clientTotal} bytes) within limit of ${CLIENT_JS_LIMIT} bytes`)
  }

  // Check server bundle
  const serverDir = join('server', 'dist')
  const serverFiles = getJsFiles(serverDir)
  let serverTotal = 0
  for (const f of serverFiles) {
    serverTotal += await gzipSize(f)
  }
  console.log(`Server JS bundle (gzipped): ${(serverTotal / 1024).toFixed(1)} KB`)
  if (serverTotal > SERVER_JS_LIMIT) {
    console.error(`FAIL: Server bundle ${serverTotal} bytes exceeds limit of ${SERVER_JS_LIMIT} bytes`)
    failed = true
  } else {
    console.log(`PASS: Server bundle (${serverTotal} bytes) within limit of ${SERVER_JS_LIMIT} bytes`)
  }

  if (failed) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Bundle size check failed:', err)
  process.exit(1)
})
