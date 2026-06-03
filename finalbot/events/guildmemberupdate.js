const { antinukeCheck } = require('../utils/antinuke');
const store = require('../utils/store');

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

    // Skip whitelisted and owner
    if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return;

    await antinukeCheck(
      guild,
      executorId,
      `Unauthorized role modification on <@${newMember.id}>`,
      async () => {
        try {
          if (addedRoles.size > 0)   await newMember.roles.remove(addedRoles, 'Anti-Nuke: Reverting role add');
          if (removedRoles.size > 0) await newMember.roles.add(removedRoles,  'Anti-Nuke: Reverting role remove');
        } catch (_) {}
      }
    );
  },
};
