const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'unban',
  description: 'Unban a user by ID',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const userId = args[0];
    if (!userId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Please provide the user ID to unban.')] });

    try {
      const user = await message.client.users.fetch(userId).catch(() => null);
      await message.guild.bans.remove(userId);

      // Try to DM the unbanned user
      if (user) {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF7F)
          .setTitle(`✅ You have been Unbanned`)
          .setThumbnail(message.guild.iconURL())
          .addFields(
            { name: '🏠 Server', value: message.guild.name, inline: true },
            { name: '👮 Unbanned by', value: message.author.tag, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
            { name: '🔄 Rejoin', value: 'You can now rejoin the server using an invite link.' },
          )
          .setFooter({ text: `${message.guild.name} — Unbanned` })
          .setTimestamp();

        try { await user.send({ embeds: [dmEmbed] }); } catch (_) {}
      }

      message.reply({ embeds: [successEmbed('User Unbanned', `User \`${userId}\` has been unbanned${user ? ` (${user.tag})` : ''}.`)] });
    } catch (e) {
      message.reply({ embeds: [errorEmbed('Unban Failed', e.message)] });
    }
  },
};
