const SessionManager = require('../src/utils/sessionManager');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
    const countBefore = SessionManager.getSessionCount();
    
    await SessionManager.cleanupOlderThan(ONE_DAY_MS);
    
    const countAfter = SessionManager.getSessionCount();
    const cleanedUp = countBefore - countAfter;
    
    console.log(`Cleaned up ${cleanedUp} sessions, ${countAfter} remaining`);
    process.exit(0);
}

main().catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
});
