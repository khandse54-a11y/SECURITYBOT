const { isWhitelisted } = require('../utils/whitelist');
const { trackNukeAction, nukeban } = require('./messageCreate');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role.guild) return;
    const logs  = await role.guild.fetchAuditLogs({ type: 32, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (!executor || isWhitelisted(executor.id) || executor.id === client.user.id) return;
    if (trackNukeAction('roleDelete', executor.id))
      await nukeban(role.guild, executor.id, 'Mass role deletion', client);
  }
};
