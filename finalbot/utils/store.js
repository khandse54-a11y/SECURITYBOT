// utils/store.js — In-memory store for whitelist, autorole, giveaways

const whitelist = new Set([
  '1018124017581953074', // Server Owner — permanently whitelisted
]);

const autoRoles = new Map();   // guildId -> roleId
const banned   = new Set();
const giveaways = new Map();   // messageId -> giveaway data

module.exports = {
  // ── Whitelist ──────────────────────────────────────────────────────────────
  addWhitelist(userId)      { whitelist.add(userId); },
  removeWhitelist(userId)   { whitelist.delete(userId); },
  isWhitelisted(userId)     { return whitelist.has(userId); },
  getWhitelist()            { return [...whitelist]; },

  // ── Auto-Role ──────────────────────────────────────────────────────────────
  setAutoRole(guildId, roleId) { autoRoles.set(guildId, roleId); },
  getAutoRole(guildId)         { return autoRoles.get(guildId) || null; },
  clearAutoRole(guildId)       { autoRoles.delete(guildId); },

  // ── Banned tracking ────────────────────────────────────────────────────────
  markBanned(userId)   { banned.add(userId); },
  isBanned(userId)     { return banned.has(userId); },

  // ── Giveaways ──────────────────────────────────────────────────────────────
  giveaways,
};
