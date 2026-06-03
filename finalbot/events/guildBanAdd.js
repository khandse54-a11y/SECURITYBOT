const { antinukeCheck } = require('../utils/antinuke');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const guild = ban.guild;

    // Fetch audit log to find who did the ban
    const logs = await guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null); // 22 = MEMBER_BAN_ADD
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry) return;

    const executorId = entry.executor?.id;
    if (!executorId) return;

    // Don't flag if bot itself did the ban
    if (executorId === client.user.id) return;

    await antinukeCheck(
      guild,
      executorId,
      `Mass ban (banned <@${ban.user.id}>)`,
      async () => {
        // Try to unban the victim
        try { await guild.bans.remove(ban.user.id, 'Anti-Nuke: Reverting ban by nuker'); } catch (_) {}
      }
    );
  },
};
