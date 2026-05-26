const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const logs  = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (!entry) return;

    const executor = entry.executor;
    if (!executor || isWhitelisted(executor.id) || executor.id === client.user.id) return;

    const now  = Date.now();
    if (!client.nukeTracker) client.nukeTracker = {};
    if (!client.nukeTracker.ban) client.nukeTracker.ban = new Map();

    const map  = client.nukeTracker.ban;
    const data = map.get(executor.id) || { count: 0, first: now };

    if (now - data.first > 8000) {
      map.set(executor.id, { count: 1, first: now });
    } else {
      data.count++;
      map.set(executor.id, data);
      if (data.count >= 2) {
        await ban.guild.members.ban(executor.id, { reason: '🔒 ANTI-NUKE: Mass banning' }).catch(() => {});
        const ch = ban.guild.channels.cache.find(
          c => c.isTextBased() && ['mod-log','security-log','bot-log','logs','general'].includes(c.name)
        );
        if (ch) ch.send(`🚨 **ANTI-NUKE!** <@${executor.id}> **BANNED** — Mass banning members`).catch(() => {});
      }
    }
  }
};
