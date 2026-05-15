// events/roleDelete.js
const { isWhitelisted } = require('../utils/whitelist');

const tracker   = new Map();
const THRESHOLD = 3;
const WINDOW_MS = 10_000;

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    const guild = role.guild;
    if (!guild) return;

    await new Promise(r => setTimeout(r, 800));
    const logs = await guild.fetchAuditLogs({ type: 32, limit: 1 }).catch(() => null);
    if (!logs) return;
    const entry = logs.entries.first();
    if (!entry) return;

    const executor = entry.executor;
    if (!executor || executor.id === client.user.id) return;
    if (isWhitelisted(executor.id)) return;

    const now  = Date.now();
    const data = tracker.get(executor.id) || { count: 0, first: now };

    if (now - data.first > WINDOW_MS) {
      tracker.set(executor.id, { count: 1, first: now });
    } else {
      data.count++;
      tracker.set(executor.id, data);

      if (data.count >= THRESHOLD) {
        tracker.delete(executor.id);

        const member = guild.members.cache.get(executor.id)
          || await guild.members.fetch(executor.id).catch(() => null);

        if (member) {
          await member.roles.set([], 'Anti-Nuke: mass role delete').catch(() => {});
          await guild.members.ban(executor.id, { reason: '🔒 Anti-Nuke: Mass role deletion' }).catch(() => {});
        }

        logAction(guild,
          `🚨 **ROLE NUKE STOPPED!** <@${executor.id}> (\`${executor.tag}\`) was mass-deleting roles.\n✅ Nuker **banned** + roles **stripped**.`
        );
      }
    }
  }
};

async function logAction(guild, msg) {
  const ch = guild.channels.cache.find(c => c.isTextBased() && ['mod-log','security-log','bot-log','logs'].includes(c.name));
  if (ch) ch.send(`[🛡️ Security] ${msg}`).catch(() => {});
}
