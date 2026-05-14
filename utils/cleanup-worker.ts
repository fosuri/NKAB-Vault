import "dotenv/config";

/**
 * Local Cleanup Worker
 * This script pings the cleanup API endpoint periodically to simulate 
 * Vercel Crons during local development or on a custom VPS.
 */

const PORT = process.env.PORT || 3000;
const ENDPOINT = `http://localhost:${PORT}/api/cron/cleanup`;
const SECRET = process.env.CRON_SECRET;
// const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Hours
const INTERVAL_MS = 2 * 60 * 1000; // 2 Minutes (for testing)

if (!SECRET) {
  console.error("[worker] ERROR: CRON_SECRET is not defined in .env");
  process.exit(1);
}

async function triggerCleanup() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[worker] ${timestamp} - Running scheduled cleanup API...`);
  
  try {
    const response = await fetch(ENDPOINT, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SECRET}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[worker] SUCCESS: Processed ${data.posts.deleted} posts and ${data.comments.deleted} comments.`);
    } else {
      console.error("[worker] ERROR returned by API:", data.error || response.statusText);
    }
  } catch (error) {
    console.error("[worker] NETWORK ERROR (is the server running?):", error instanceof Error ? error.message : error);
  }
  console.log(`[worker] Next run scheduled for: ${new Date(Date.now() + INTERVAL_MS).toLocaleTimeString()}\n`);
}

console.log(`[worker] Started. Target: ${ENDPOINT}`);
console.log(`[worker] Interval: ${INTERVAL_MS / 1000 / 60} minutes`);

// Initial delay to give the Next.js server time to start up
setTimeout(() => {
  triggerCleanup();
  setInterval(triggerCleanup, INTERVAL_MS);
}, 5000);
