const store = require('./store');
const { warnEmbed } = require('./embeds');

/**
 * Called for every dangerous action (role add/delete, channel delete, ban, kick, etc.)
 * If a non-whitelisted user exceeds the threshold → ban them and undo the action.
 *
 * @param {Guild}  guild
 * @param {string} userId   – the executor's ID
 * @param {string} actionLabel – human-readable action name for logs
 * @param {Function|null} undoFn – async function to undo the action (optional)
 * @returns {boolean}  true if the user was nuked (banned), false if safe
 */
async function antinukeCheck(guild, userId, actionLabel, undoFn = null) {
  // Whitelisted users are always safe
  if (store.isWhitelisted(userId)) return false;
  // Bot itself is always safe
  if (userId === guild.client.user.id) return false;
  // Guild owner is always safe
  if (userId === guild.ownerId) return false;

  const count = store.recordAction(userId);

  if (count >= store.NUKE_THRESHOLD) {
    // Already banned this session?
    if (store.isBanned(userId)) return true;
    store.markBanned(userId);

    // Attempt to undo the action
    if (undoFn) {
      try { await undoFn(); } catch (_) {}
    }

    // Ban the user
    try {
      await guild.bans.create(userId, {
        reason: `🔒 Anti-Nuke: Detected ${count} suspicious actions (${actionLabel}) in rapid succession.`,
        deleteMessageSeconds: 0,
      });
    } catch (err) {
      console.error(`[AntiNuke] Failed to ban ${userId}:`, err.message);
    }

    // Log to system channel or first text channel
    const logChannel = guild.systemChannel
      || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));

    if (logChannel) {
      const embed = warnEmbed(
        '🚨 Anti-Nuke Triggered',
        `**User <@${userId}> has been auto-banned!**\n\n` +
        `**Action detected:** ${actionLabel}\n` +
        `**Actions in window:** ${count}\n` +
        `**Threshold:** ${store.NUKE_THRESHOLD} actions / 8s\n\n` +
        `User was **banned** and the action was **reversed** automatically.`
      );
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    return true;
  }

  return false;
}

module.exports = { antinukeCheck };
