const { isWhitelisted } = require('../utils/whitelist');
const { trackNukeAction, nukeban } = require('./messageCreate');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const logs  = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (!executor || isWhitelisted(executor.id) || executor.id === client.user.id) return;
    if (trackNukeAction('ban', executor.id))
      await nukeban(ban.guild, executor.id, 'Mass banning members', client);
  }
};
