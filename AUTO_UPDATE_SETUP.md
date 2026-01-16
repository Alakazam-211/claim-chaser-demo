# Automatic Claim Update Setup

This system **automatically** checks every minute for completed calls and processes their transcripts to update claims with denial reasons.

## How It Works

1. **When a call is made**: The system stores the `conversation_id` and creates a call record with status "initiated"
2. **Every minute**: A cron job checks all active calls (status: "initiated" or "in_progress")
3. **Check completion**: For each active call, the system queries ElevenLabs API to see if the conversation is completed
4. **Auto-process**: If completed, the transcript is automatically fetched and processed
5. **Extract & update**: Denial reasons, next steps, and resubmission instructions are extracted and the claim is updated
6. **Prevent re-calling**: Claims with denial reasons are automatically excluded from future calls

## Setup

### 1. Database Migration ✅

The `calls` table has been created and is ready to use.

### 2. Vercel Cron Configuration ✅

The cron job is configured in `vercel.json` to run every minute:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-completed-calls",
      "schedule": "* * * * *"
    }
  ]
}
```

### 3. Environment Variables

Make sure these are set in your Vercel project:

- `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- `CRON_SECRET` (optional) - Secret for securing the cron endpoint
- `NEXT_PUBLIC_APP_URL` (optional) - Your app URL for internal API calls (e.g., `https://app.claimchaser.ai`)
- `NEXT_PUBLIC_SITE_URL` (optional) - Your site URL (e.g., `https://app.claimchaser.ai` for production or `https://demo.claimchaser.ai` for demo)

### 4. Deploy

After deploying to Vercel, the cron job will automatically start running every minute.

## How It Works Automatically

1. **Call Initiated**: When `/api/make-call` is called, it:
   - Creates a call record with status "initiated"
   - Stores the `conversation_id` from ElevenLabs
   - Links the call to the claim

2. **Cron Job Runs** (every minute):
   - Finds all calls with status "initiated" or "in_progress" that started more than 1 minute ago
   - For each call, checks ElevenLabs API to see if conversation is completed
   - If still in progress, updates status to "in_progress"
   - If completed, processes the transcript automatically

3. **Transcript Processing**:
   - Fetches full transcript from ElevenLabs
   - Extracts denial reasons using pattern matching
   - Extracts next steps and resubmission instructions
   - Updates the call record with transcript and extracted data
   - Updates the claim with denial reasons and other info
   - Changes claim status from "Denied" to "Pending Resubmission" if applicable

4. **Prevention**: The `/api/make-call` endpoint automatically excludes claims that already have denial reasons

## Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X GET https://your-domain.com/api/cron/process-completed-calls \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or without auth (if CRON_SECRET is not set):

```bash
curl -X GET https://your-domain.com/api/cron/process-completed-calls
```

## Monitoring

Check the cron job logs in Vercel to see:
- How many calls were checked
- How many were processed successfully
- Any errors that occurred

The response includes:
```json
{
  "success": true,
  "message": "Checked 3 active calls",
  "processed": 2,
  "errors": 0
}
```

## Troubleshooting

### Calls not being processed

1. **Check cron is running**: Look at Vercel logs for the cron endpoint
2. **Verify conversation_id**: Make sure calls have a `conversation_id` stored
3. **Check ElevenLabs API**: Verify the API key is correct and conversations are accessible
4. **Check call status**: Calls must be "initiated" or "in_progress" and older than 1 minute

### No denial reasons extracted

- The extraction uses pattern matching - check the transcript in the `calls` table
- Look for messages containing "denied", "denial", "rejected", etc.
- Consider improving the extraction patterns in `process-transcript-internal.ts`

### Claims not updating

- Verify the `claim_id` is correctly linked in the `calls` table
- Check server logs for errors
- Ensure the claim exists in the database

## Architecture

- **Cron Endpoint**: `/api/cron/process-completed-calls` - Runs every minute
- **Processing Function**: `process-transcript-internal.ts` - Shared logic for processing
- **API Endpoint**: `/api/calls/process-transcript` - Can be called manually if needed
- **Database**: `calls` table tracks all calls and their status

The system is fully automated - no manual intervention needed! 🎉
