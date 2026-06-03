const { antinukeCheck } = require('../utils/antinuke');
const store = require('../utils/store');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    const guild = role.guild;

    const logs = await guild.fetchAuditLogs({ limit: 1, type: 32 }).catch(() => null);
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
      `Role deletion (@${role.name})`,
      async () => {
        try {
          await guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            mentionable: role.mentionable,
            reason: 'Anti-Nuke: Restoring deleted role',
          });
        } catch (_) {}
      }
    );
  },
};
