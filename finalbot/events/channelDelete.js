const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;

    const logs  = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (!entry) return;

    const executor = entry.executor;
    if (!executor || isWhitelisted(executor.id) || executor.id === client.user.id) return;

    const now  = Date.now();
    if (!client.nukeTracker) client.nukeTracker = {};
    if (!client.nukeTracker.channelDelete) client.nukeTracker.channelDelete = new Map();

    const map  = client.nukeTracker.channelDelete;
    const data = map.get(executor.id) || { count: 0, first: now };

    if (now - data.first > 8000) {
      map.set(executor.id, { count: 1, first: now });
    } else {
      data.count++;
      map.set(executor.id, data);
      if (data.count >= 2) {
        await channel.guild.members.ban(executor.id, { reason: '🔒 ANTI-NUKE: Mass channel deletion' }).catch(() => {});
        const ch = channel.guild.channels.cache.find(
          c => c.isTextBased() && ['mod-log','security-log','bot-log','logs','general'].includes(c.name)
        );
        if (ch) ch.send(`🚨 **ANTI-NUKE!** <@${executor.id}> **BANNED** — Mass channel deletion`).catch(() => {});
      }
    }
  }
};
