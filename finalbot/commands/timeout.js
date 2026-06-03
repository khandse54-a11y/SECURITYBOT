const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'timeout',
  description: 'Timeout a member',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid member.')] });

    const durationStr = args[1] || '10m';
    const match = durationStr.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Use format: `10s`, `10m`, `1h`, `1d`')] });

    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = parseInt(match[1]) * units[match[2]];
    const reason = args.slice(2).join(' ') || 'No reason provided';

    // DM the user BEFORE timeout
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle(`🔇 You have been Timed Out`)
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: '🏠 Server', value: message.guild.name, inline: true },
        { name: '👮 Timed out by', value: message.author.tag, inline: true },
        { name: '⏱️ Duration', value: durationStr, inline: true },
        { name: '📋 Reason', value: reason },
        { name: '🔓 Timeout ends', value: `<t:${Math.floor((Date.now() + ms) / 1000)}:R>` },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
      )
      .setFooter({ text: 'You will be able to chat again after the timeout ends.' })
      .setTimestamp();

    try { await target.send({ embeds: [dmEmbed] }); } catch (_) {}

    try {
      await target.timeout(ms, reason);
      message.reply({ embeds: [successEmbed('Member Timed Out', `**${target.user.tag}** has been timed out for **${durationStr}**.\n**Reason:** ${reason}`)] });
    } catch (e) {
      message.reply({ embeds: [errorEmbed('Timeout Failed', e.message)] });
    }
  },
};
