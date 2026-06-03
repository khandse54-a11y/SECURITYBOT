const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a member from the server',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid member.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // DM the user BEFORE ban (after ban they leave so DM may fail)
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`🔨 You have been Banned`)
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: '🏠 Server', value: message.guild.name, inline: true },
        { name: '👮 Banned by', value: message.author.tag, inline: true },
        { name: '📋 Reason', value: reason },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
        { name: '❓ Appeal', value: 'Contact a server admin if you believe this was a mistake.' },
      )
      .setFooter({ text: `${message.guild.name} — Permanent Ban` })
      .setTimestamp();

    try { await target.send({ embeds: [dmEmbed] }); } catch (_) {}

    try {
      await target.ban({ reason, deleteMessageSeconds: 7 * 24 * 60 * 60 });
      message.reply({ embeds: [successEmbed('Member Banned', `**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
    } catch (e) {
      message.reply({ embeds: [errorEmbed('Ban Failed', e.message)] });
    }
  },
};
