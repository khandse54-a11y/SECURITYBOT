const { isWhitelisted } = require('../utils/whitelist');
const { trackNukeAction, nukeban } = require('./messageCreate');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    const logs  = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (!executor || isWhitelisted(executor.id) || executor.id === client.user.id) return;
    if (trackNukeAction('channelDelete', executor.id))
      await nukeban(channel.guild, executor.id, 'Mass channel deletion', client);
  }
};
