const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

const warnings = new Map();

module.exports = {
  name: 'warn',
  description: 'Warn a member',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid member.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const key = `${message.guild.id}-${target.id}`;
    if (!warnings.has(key)) warnings.set(key, []);
    warnings.get(key).push({ reason, by: message.author.tag, at: new Date().toISOString() });
    const count = warnings.get(key).length;

    // DM the warned user
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle(`⚠️ You have been Warned`)
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: '🏠 Server', value: message.guild.name, inline: true },
        { name: '👮 Warned by', value: message.author.tag, inline: true },
        { name: '⚠️ Warning #', value: `${count}`, inline: true },
        { name: '📋 Reason', value: reason },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
      )
      .setFooter({ text: 'Please follow the server rules to avoid further action.' })
      .setTimestamp();

    try {
      await target.send({ embeds: [dmEmbed] });
    } catch (_) {}

    message.reply({ embeds: [successEmbed('Member Warned', `**${target.user.tag}** has been warned.\n**Reason:** ${reason}\n**Total warnings:** ${count}`)] });
  },
};
