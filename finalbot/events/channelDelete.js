const { antinukeCheck } = require('../utils/antinuke');
const { ChannelType } = require('discord.js');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = channel.guild;

    const logs = await guild.fetchAuditLogs({ limit: 1, type: 12 }).catch(() => null); // 12 = CHANNEL_DELETE
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

    const executorId = entry.executor?.id;
    if (!executorId || executorId === client.user.id) return;

    await antinukeCheck(
      guild,
      executorId,
      `Channel deletion (#${channel.name})`,
      async () => {
        // Recreate the channel
        try {
          await guild.channels.create({
            name: channel.name,
            type: channel.type,
            topic: channel.topic || undefined,
            nsfw: channel.nsfw || false,
            parent: channel.parentId || null,
            reason: 'Anti-Nuke: Restoring deleted channel',
          });
        } catch (_) {}
      }
    );
  },
};
