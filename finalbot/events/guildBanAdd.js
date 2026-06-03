const { antinukeCheck } = require('../utils/antinuke');
const store = require('../utils/store');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const guild = ban.guild;

    const logs = await guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry) return;

    const executorId = entry.executor?.id;
    if (!executorId || executorId === client.user.id) return;

    // Skip whitelisted and owner
    if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return;

    await antinukeCheck(
      guild,
      executorId,
      `Mass ban (banned <@${ban.user.id}>)`,
      async () => {
        try { await guild.bans.remove(ban.user.id, 'Anti-Nuke: Reverting ban'); } catch (_) {}
      }
    );
  },
};
