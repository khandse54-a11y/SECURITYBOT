const store = require('../utils/store');
const { warnEmbed } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const guild = newMember.guild;

    const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (addedRoles.size === 0 && removedRoles.size === 0) return;

    const logs = await guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null);
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

    const executorId = entry.executor?.id;
    if (!executorId || executorId === client.user.id) return;

    // Skip whitelisted and owner — they can freely manage roles
    if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return;

    // Non-whitelisted tried to add/remove roles → INSTANT BAN + revert
    console.log(`[Security] Non-whitelisted ${executorId} modified roles → instant ban`);

    // Revert role changes first
    try {
      if (addedRoles.size > 0)   await newMember.roles.remove(addedRoles,  'Anti-Nuke: Reverting unauthorized role add');
      if (removedRoles.size > 0) await newMember.roles.add(removedRoles,   'Anti-Nuke: Reverting unauthorized role remove');
    } catch (_) {}

    // Instant ban
    try {
      await guild.bans.create(executorId, {
        reason: '🔒 Security: Non-whitelisted user attempted to modify member roles.',
      });
      store.markBanned(executorId);
    } catch (err) {
      console.error('[Security] Failed to ban:', err.message);
    }

    // Log to system channel
    try {
      const logChannel = guild.systemChannel
        || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));

      if (logChannel) {
        logChannel.send({
          embeds: [warnEmbed(
            '🚨 Unauthorized Role Modification — BANNED',
            `<@${executorId}> tried to **${addedRoles.size > 0 ? 'add' : 'remove'} roles** on <@${newMember.id}> without being whitelisted.\n\n**Action:** Instant ban + roles reverted.`
          )]
        }).catch(() => {});
      }
    } catch (_) {}
  },
};
