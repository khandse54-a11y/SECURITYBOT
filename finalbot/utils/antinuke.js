// utils/antinuke.js
const store  = require('./store');
const { warnEmbed } = require('./embeds');

const actionLog = new Map();
const THRESHOLD = 3;
const RESET_MS  = 10_000;

async function antinukeCheck(guild, executorId, reason, revertFn) {
  // Always skip whitelisted users, server owner, and hardcoded owner
  if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return false;
  if (store.isBanned(executorId)) return false;

  if (!actionLog.has(executorId)) actionLog.set(executorId, { count: 0, timer: null });
  const entry = actionLog.get(executorId);

  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => actionLog.delete(executorId), RESET_MS);
  entry.count++;

  console.log(`[AntiNuke] ${executorId} — action #${entry.count}: ${reason}`);

  if (typeof revertFn === 'function') {
    try { await revertFn(); } catch (_) {}
  }

  if (entry.count < THRESHOLD) return false;

  clearTimeout(entry.timer);
  actionLog.delete(executorId);
  store.markBanned(executorId);

  try {
    await guild.bans.create(executorId, {
      reason: `🔒 Anti-Nuke: ${THRESHOLD}+ destructive actions. Last: ${reason}`,
    });
    console.log(`[AntiNuke] BANNED nuker ${executorId}`);
  } catch (err) {
    console.error(`[AntiNuke] Failed to ban ${executorId}:`, err.message);
  }

  try {
    const logChannel = guild.systemChannel
      || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));
    if (logChannel) {
      await logChannel.send({
        embeds: [warnEmbed(
          '🚨 NUKE ATTEMPT DETECTED & BLOCKED',
          `<@${executorId}> triggered **${THRESHOLD} destructive actions** in rapid succession.\n\n**Last action:** ${reason}\n**Result:** Permanently banned.`
        )],
      });
    }
  } catch (_) {}

  return true;
}

module.exports = { antinukeCheck };
