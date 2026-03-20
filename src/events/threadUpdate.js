const { SessionManager } = require('../utils/sessionManager');

const name = 'threadUpdate';

async function execute(oldThread, newThread) {
  // Check if thread was archived
  const wasArchived = !oldThread.archived && newThread.archived;
  
  if (wasArchived) {
    console.log(`[Thread] ${newThread.id} archived, cleaning up session`);
    
    if (SessionManager.has(newThread.id)) {
      SessionManager.delete(newThread.id);
      console.log(`[Thread] Session ${newThread.id} cleaned up`);
    }
  }
}

module.exports = { name, execute };
