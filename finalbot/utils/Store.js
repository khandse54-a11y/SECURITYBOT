// ============================================================
//  utils/store.js  –  in-memory data store (no database needed)
// ============================================================

const store = {
  // Set of whitelisted user IDs
  whitelist: new Set(),

  // Map of guildId -> roleId for auto-role
  autoRole: new Map(),

  // Active giveaways  Map of messageId -> giveaway object
  giveaways: new Map(),

  // Anti-nuke action tracking  Map of userId -> { actions: [], banned: bool }
  nukeTracker: new Map(),

  // Anti-nuke thresholds (actions within TIME_WINDOW ms)
  NUKE_THRESHOLD: 3,
  TIME_WINDOW: 8000, // 8 seconds

  // ── Whitelist helpers ──────────────────────────────────────
  addWhitelist(userId) { this.whitelist.add(userId); },
  removeWhitelist(userId) { this.whitelist.delete(userId); },
  isWhitelisted(userId) { return this.whitelist.has(userId); },
  getWhitelist() { return [...this.whitelist]; },

  // ── Auto-role helpers ──────────────────────────────────────
  setAutoRole(guildId, roleId) { this.autoRole.set(guildId, roleId); },
  getAutoRole(guildId) { return this.autoRole.get(guildId) || null; },
  clearAutoRole(guildId) { this.autoRole.delete(guildId); },

  // ── Nuke tracker helpers ───────────────────────────────────
  recordAction(userId) {
    const now = Date.now();
    if (!this.nukeTracker.has(userId)) {
      this.nukeTracker.set(userId, { actions: [], banned: false });
    }
    const data = this.nukeTracker.get(userId);
    data.actions.push(now);
    // Remove actions older than TIME_WINDOW
    data.actions = data.actions.filter(t => now - t < this.TIME_WINDOW);
    return data.actions.length;
  },
  isBanned(userId) {
    return this.nukeTracker.get(userId)?.banned || false;
  },
  markBanned(userId) {
    if (!this.nukeTracker.has(userId)) {
      this.nukeTracker.set(userId, { actions: [], banned: true });
    } else {
      this.nukeTracker.get(userId).banned = true;
    }
  },
};

module.exports = store;
