# Cron Job Setup Guide

## How Vercel Cron Jobs Work

**Important**: Vercel cron jobs **ONLY run automatically in production** on Vercel's platform. They do **NOT** run locally during development.

### Current Configuration

Your cron job is configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-completed-calls",
      "schedule": "* * * * *"  // Every minute
    }
  ]
}
```

## Verifying Cron Job is Enabled in Vercel

1. **Go to your Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Check Cron Jobs**
   - Go to **Settings** → **Cron Jobs** (or look for "Cron" in the sidebar)
   - You should see your cron job listed: `/api/cron/process-completed-calls`
   - Verify it shows schedule: `* * * * *` (every minute)
   - Check that it's **Enabled** (not paused)

3. **Check Cron Logs**
   - Go to **Deployments** → Select latest deployment → **Functions** tab
   - Look for `/api/cron/process-completed-calls` in the function logs
   - You should see logs every minute if it's running

4. **Verify Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Ensure `ELEVENLABS_API_KEY` is set
   - Optionally set `CRON_SECRET` for security

## Why You're Having to Trigger Manually

If you're running locally (`npm run dev`), the cron job **will not run automatically**. This is expected behavior.

If you're in production on Vercel and still having to trigger manually:
1. The cron job might not be enabled in Vercel dashboard
2. The deployment might not have picked up the `vercel.json` changes
3. There might be an error preventing the cron from running

## Solutions

### Option 1: Enable in Vercel (Production)

1. **Redeploy your project** to ensure `vercel.json` is picked up:
   ```bash
   git add vercel.json
   git commit -m "Ensure cron job is configured"
   git push
   ```

2. **Verify in Vercel Dashboard**:
   - Settings → Cron Jobs
   - Make sure the cron job is listed and enabled

3. **Check the logs** to see if it's running every minute

### Option 2: Local Development Solution

For local development, you can use one of these approaches:

#### A. Use a Local Cron Script (macOS/Linux)

Create a script to run the cron job locally:

```bash
# Run this in a separate terminal while developing
watch -n 60 curl -X POST http://localhost:3004/api/cron/process-completed-calls
```

Or create `run-cron-local.sh`:
```bash
#!/bin/bash
while true; do
  echo "Running cron job at $(date)"
  curl -X POST http://localhost:3004/api/cron/process-completed-calls
  sleep 60
done
```

Make it executable and run:
```bash
chmod +x run-cron-local.sh
./run-cron-local.sh
```

#### B. Use Node.js Script

Create `scripts/run-cron-local.js`:
```javascript
const http = require('http');

function runCron() {
  const options = {
    hostname: 'localhost',
    port: 3004,
    path: '/api/cron/process-completed-calls',
    method: 'POST',
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Cron response:`, data);
    });
  });

  req.on('error', (e) => {
    console.error(`[${new Date().toISOString()}] Cron error:`, e.message);
  });

  req.end();
}

// Run immediately, then every minute
runCron();
setInterval(runCron, 60000);
```

Run with: `node scripts/run-cron-local.js`

### Option 3: Manual Trigger (Current Workaround)

You can manually trigger the cron job:
```bash
curl -X POST http://localhost:3004/api/cron/process-completed-calls
```

Or if deployed:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/process-completed-calls
```

## Troubleshooting

### Cron Job Not Running in Production

1. **Check Vercel Dashboard**:
   - Settings → Cron Jobs → Verify it's enabled
   - Check if there are any errors shown

2. **Check Deployment**:
   - Ensure `vercel.json` is in your repository
   - Redeploy if you just added/updated `vercel.json`

3. **Check Logs**:
   - Go to your deployment → Functions → `/api/cron/process-completed-calls`
   - Look for errors or see if requests are coming in

4. **Verify Endpoint Works**:
   - Manually trigger it: `curl -X POST https://your-domain.vercel.app/api/cron/process-completed-calls`
   - If it works manually but not automatically, the cron configuration might be wrong

### Common Issues

- **Cron not showing in Vercel**: Make sure `vercel.json` is in the root directory and you've redeployed
- **Cron running but failing**: Check the function logs for errors
- **Cron not triggering**: Verify the schedule syntax is correct (`* * * * *` for every minute)

## Testing

To test if the cron job works:

1. **Create a test call** (or use an existing one)
2. **Wait 1-2 minutes** (if in production)
3. **Check the database** to see if the call was processed:
   ```sql
   SELECT id, status, extracted_data, ended_at 
   FROM calls 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## Summary

- **Production (Vercel)**: Cron runs automatically every minute ✅
- **Local Development**: Cron does NOT run automatically - use manual trigger or local script ❌
- **To enable in production**: Ensure `vercel.json` is deployed and cron is enabled in Vercel dashboard


