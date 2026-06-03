const store = require('../utils/store');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

const OWNER_ID = '1018124017581953074';

module.exports = {
  name: 'whitelist',
  description: 'Manage the server whitelist',
  async execute(message, args) {
    // Only server owner or hardcoded owner can manage whitelist
    if (message.author.id !== message.guild.ownerId && message.author.id !== OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Access Denied', 'Only the **server owner** can manage the whitelist.')] });
    }

    const sub = args[0]?.toLowerCase();

    // !whitelist add @user or !whitelist add ID
    if (sub === 'add') {
      const target = message.mentions.users.first()
        || await message.client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a user or provide their ID.')] });

      store.addWhitelist(target.id);

      const embed = new EmbedBuilder()
        .setColor(0x00FF7F)
        .setTitle('✅ User Whitelisted')
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: '🆔 ID', value: target.id, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '🔓 Permissions Unlocked', value: [
            '✅ Add / Remove Roles',
            '✅ Kick & Ban Members',
            '✅ Create / Delete Channels',
            '✅ Manage Server Settings',
            '✅ All Admin Actions',
          ].join('\n') },
          { name: '🛡️ Anti-Nuke', value: 'This user is **exempt** from anti-nuke protection.' }
        )
        .setFooter({ text: `Whitelisted by ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // !whitelist remove @user or !whitelist remove ID
    if (sub === 'remove') {
      const target = message.mentions.users.first()
        || await message.client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a user or provide their ID.')] });

      if (!store.isWhitelisted(target.id)) {
        return message.reply({ embeds: [errorEmbed('Not Whitelisted', `<@${target.id}> is not on the whitelist.`)] });
      }

      store.removeWhitelist(target.id);
      return message.reply({ embeds: [successEmbed('Removed from Whitelist', `<@${target.id}> has been **removed** from the whitelist.`)] });
    }

    // !whitelist list
    if (sub === 'list') {
      const list = store.getWhitelist();
      if (list.length === 0) {
        return message.reply({ embeds: [infoEmbed('Whitelist', 'No users are currently whitelisted.')] });
      }
      const entries = list.map((id, i) => `${i + 1}. <@${id}> (\`${id}\`)`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🛡️ Whitelisted Users (${list.length})`)
        .setDescription(entries)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // !whitelist check @user
    if (sub === 'check') {
      const target = message.mentions.users.first()
        || await message.client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a user or provide their ID.')] });

      const wl = store.isWhitelisted(target.id);
      const embed = new EmbedBuilder()
        .setColor(wl ? 0x00FF7F : 0xFF4444)
        .setTitle(wl ? '✅ User is Whitelisted' : '❌ User is NOT Whitelisted')
        .setDescription(`<@${target.id}> is **${wl ? 'on' : 'not on'}** the whitelist.`)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // Help
    return message.reply({ embeds: [infoEmbed('Whitelist Command', [
      '`!whitelist add @user` – Add a user to the whitelist',
      '`!whitelist add <userID>` – Add by ID',
      '`!whitelist remove @user` – Remove a user',
      '`!whitelist list` – Show all whitelisted users',
      '`!whitelist check @user` – Check if a user is whitelisted',
    ].join('\n'))] });
  },
};
