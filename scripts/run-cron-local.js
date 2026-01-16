#!/usr/bin/env node

/**
 * Local cron job runner for development
 * Runs the process-completed-calls endpoint every minute
 * 
 * Usage: node scripts/run-cron-local.js
 * 
 * Make sure your Next.js dev server is running on port 3004
 */

const http = require('http');

const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || 'localhost';
const ENDPOINT = '/api/cron/process-completed-calls';
const INTERVAL_MS = 60000; // 1 minute

function runCron() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Running cron job...`);

  const options = {
    hostname: HOST,
    port: PORT,
    path: ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`[${timestamp}] ✅ Success:`, json.message || 'Processed');
        if (json.processed !== undefined) {
          console.log(`    Processed: ${json.processed} call(s)`);
        }
        if (json.errors !== undefined && json.errors > 0) {
          console.log(`    ⚠️  Errors: ${json.errors}`);
        }
      } catch (e) {
        console.log(`[${timestamp}] Response:`, data.substring(0, 200));
      }
    });
  });

  req.on('error', (e) => {
    console.error(`[${timestamp}] ❌ Error:`, e.message);
    console.error(`    Make sure your Next.js server is running on port ${PORT}`);
  });

  req.end();
}

// Run immediately
console.log(`Starting local cron job runner...`);
console.log(`Will call http://${HOST}:${PORT}${ENDPOINT} every ${INTERVAL_MS / 1000} seconds`);
console.log(`Press Ctrl+C to stop\n`);

runCron();

// Then run every minute
const interval = setInterval(runCron, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping cron job runner...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nStopping cron job runner...');
  clearInterval(interval);
  process.exit(0);
});


