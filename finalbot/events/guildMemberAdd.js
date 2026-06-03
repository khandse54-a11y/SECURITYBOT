const store = require('../utils/store');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Apply auto-role if set
    const roleId = store.getAutoRole(member.guild.id);
    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.add(role, 'Auto-Role on join');
          console.log(`[AutoRole] Gave "${role.name}" to ${member.user.tag}`);
        } catch (err) {
          console.error(`[AutoRole] Failed to assign role:`, err.message);
        }
      }
    }

    // Log new member to system channel
    const logChannel = member.guild.systemChannel
      || member.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(member.guild.members.me)?.has('SendMessages'));

    if (logChannel) {
      const wl = store.isWhitelisted(member.id) || member.id === member.guild.ownerId;
      const embed = new EmbedBuilder()
        .setColor(wl ? 0x00FF7F : 0xFFAA00)
        .setTitle('👋 New Member Joined')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '🛡️ Status', value: wl ? '✅ Whitelisted' : '🔒 Not Whitelisted — limited permissions', inline: false },
          { name: '🎭 Auto-Role', value: roleId ? `<@&${roleId}>` : 'None', inline: true },
        )
        .setFooter({ text: `Member count: ${member.guild.memberCount}` })
        .setTimestamp();

      logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
