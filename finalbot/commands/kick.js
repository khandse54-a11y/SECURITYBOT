const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid member.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // DM the user BEFORE kick
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setTitle(`👢 You have been Kicked`)
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: '🏠 Server', value: message.guild.name, inline: true },
        { name: '👮 Kicked by', value: message.author.tag, inline: true },
        { name: '📋 Reason', value: reason },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
        { name: '🔄 Rejoin', value: 'You may rejoin the server using an invite link.' },
      )
      .setFooter({ text: `${message.guild.name} — Kicked` })
      .setTimestamp();

    try { await target.send({ embeds: [dmEmbed] }); } catch (_) {}

    try {
      await target.kick(reason);
      message.reply({ embeds: [successEmbed('Member Kicked', `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
    } catch (e) {
      message.reply({ embeds: [errorEmbed('Kick Failed', e.message)] });
    }
  },
};
