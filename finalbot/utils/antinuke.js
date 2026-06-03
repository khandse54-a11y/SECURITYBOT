// utils/antinuke.js — Anti-nuke threshold tracker & action handler

const store  = require('./store');
const { warnEmbed } = require('./embeds');

// Track actions per executor: Map of userId -> { count, resetTimer }
const actionLog = new Map();

const THRESHOLD = 3;          // actions before nuke triggers
const RESET_MS  = 10_000;     // reset counter after 10 seconds of no actions

/**
 * Call this whenever a destructive action is detected.
 * @param {Guild}    guild       - Discord guild
 * @param {string}   executorId  - ID of the user who did the action
 * @param {string}   reason      - Human-readable description of the action
 * @param {Function} revertFn    - Async function to revert the action
 * @returns {boolean} true if nuke threshold was hit and ban was issued
 */
async function antinukeCheck(guild, executorId, reason, revertFn) {
  // Always skip whitelisted users and the server owner
  if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return false;
  // Don't double-ban already banned nukers
  if (store.isBanned(executorId)) return false;

  // Increment action counter
  if (!actionLog.has(executorId)) {
    actionLog.set(executorId, { count: 0, timer: null });
  }
  const entry = actionLog.get(executorId);

  // Clear existing reset timer and start a fresh one
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => actionLog.delete(executorId), RESET_MS);
  entry.count++;

  console.log(`[AntiNuke] ${executorId} — action #${entry.count}: ${reason}`);

  // Attempt to revert every action regardless of threshold
  if (typeof revertFn === 'function') {
    try { await revertFn(); } catch (_) {}
  }

  // Only trigger full nuke response at threshold
  if (entry.count < THRESHOLD) return false;

  // Threshold hit — ban the nuker
  clearTimeout(entry.timer);
  actionLog.delete(executorId);
  store.markBanned(executorId);

  try {
    await guild.bans.create(executorId, {
      reason: `🔒 Anti-Nuke: ${THRESHOLD}+ destructive actions detected. Last: ${reason}`,
    });
    console.log(`[AntiNuke] BANNED nuker ${executorId}`);
  } catch (err) {
    console.error(`[AntiNuke] Failed to ban ${executorId}:`, err.message);
  }

  // Log to system channel
  try {
    const logChannel = guild.systemChannel
      || guild.channels.cache.find(
           c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages')
         );

    if (logChannel) {
      await logChannel.send({
        embeds: [warnEmbed(
          '🚨 NUKE ATTEMPT DETECTED & BLOCKED',
          `<@${executorId}> triggered **${THRESHOLD} destructive actions** in rapid succession.\n\n` +
          `**Last action:** ${reason}\n**Result:** User has been permanently banned.`
        )],
      });
    }
  } catch (_) {}

  return true;
}

module.exports = { antinukeCheck };
