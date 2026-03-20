class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Store a new session
   * @param {string} threadId - Discord thread ID
   * @param {string} workingDir - Working directory for the session
   * @param {string} sessionId - OpenCode session ID
   * @param {Object} client - OpenCode client instance
   * @returns {Object} The created session object
   */
  create(threadId, workingDir, sessionId, client) {
    const session = {
      threadId,
      workingDir,
      sessionId,
      client,
      createdAt: Date.now()
    };
    this.sessions.set(threadId, session);
    return session;
  }

  /**
   * Retrieve a session by threadId
   * @param {string} threadId - Discord thread ID
   * @returns {Object|undefined} The session object or undefined
   */
  get(threadId) {
    return this.sessions.get(threadId);
  }

  /**
   * Check if a session exists
   * @param {string} threadId - Discord thread ID
   * @returns {boolean} True if session exists
   */
  has(threadId) {
    return this.sessions.has(threadId);
  }

  /**
   * Delete a session and disconnect the client
   * @param {string} threadId - Discord thread ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(threadId) {
    const session = this.sessions.get(threadId);
    if (!session) {
      return false;
    }

    if (session.client && typeof session.client.disconnect === 'function') {
      try {
        session.client.disconnect();
      } catch (err) {
        console.error(`[SessionManager] Error disconnecting client for ${threadId}:`, err.message);
      }
    }

    this.sessions.delete(threadId);
    return true;
  }

  /**
   * Get all sessions as an array
   * @returns {Array<Object>} Array of session objects
   */
  getAll() {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up sessions older than maxAgeMs
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of sessions cleaned up
   */
  cleanupOlderThan(maxAgeMs) {
    const now = Date.now();
    const toDelete = [];

    for (const [threadId, session] of this.sessions) {
      if (now - session.createdAt > maxAgeMs) {
        toDelete.push(threadId);
      }
    }

    let cleaned = 0;
    for (const threadId of toDelete) {
      if (this.delete(threadId)) {
        cleaned++;
      }
    }

    return cleaned;
  }
}

module.exports = { SessionManager: new SessionManager() };
