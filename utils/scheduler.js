// utils/scheduler.js

/**
 * 🕒 ResQNet Auto-Reassignment Scheduler
 * ----------------------------------------------------
 * Checks if assigned hospitals fail to accept an emergency
 * within 60 seconds. If so, it triggers reassignment to
 * the next nearest hospital automatically.
 */

const hospitalController = require('../controllers/hospitalController');

// 🗺️ Stores currently pending hospital confirmations
// Key: emergencyId → Value: { timestamp, previousHospitalId }
const pendingConfirmations = new Map();

// Timeout threshold (1 minute = 60000 ms)
const TIMEOUT_MS = 60000;

/**
 * ⏱️ Check for unacknowledged emergencies every 10 seconds.
 * If a hospital hasn’t accepted within TIMEOUT_MS, the case
 * is automatically reassigned.
 */
function checkHospitalTimeouts() {
  const now = Date.now();
  const currentPending = Array.from(pendingConfirmations.entries());

  if (currentPending.length === 0) return; // No pending confirmations

  console.log(
    `🕒 [Scheduler] Checking ${currentPending.length} pending emergencies at ${new Date().toLocaleTimeString()}`
  );

  for (let [emergencyId, { timestamp, previousHospitalId }] of currentPending) {
    const elapsed = now - timestamp;

    if (elapsed > TIMEOUT_MS) {
      console.log(
        `⏰ Timeout reached for Emergency ${emergencyId} (Hospital ${previousHospitalId}). Triggering reassignment...`
      );

      // Trigger reassignment via hospital controller
      hospitalController.handleReassignment(emergencyId);

      // Remove from pending list
      pendingConfirmations.delete(emergencyId);
    }
  }
}

// Schedule check every 10 seconds
setInterval(checkHospitalTimeouts, 10000);

/**
 * ✅ Optional: Manual trigger for development
 * Run manually using: node utils/scheduler.js
 */
if (require.main === module) {
  console.log('🧭 Scheduler running in standalone mode...');
  setInterval(checkHospitalTimeouts, 10000);
}

module.exports = { pendingConfirmations };
