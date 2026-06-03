const store = require('../utils/store');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

const GIVEAWAY_EMOJI = '🎉';

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * units[match[2]];
}

async function endGiveaway(client, giveaway) {
  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  let msg;
  try { msg = await channel.messages.fetch(giveaway.messageId); } catch { return; }

  const reaction = msg.reactions.cache.get(GIVEAWAY_EMOJI);
  let entries = [];
  if (reaction) {
    const users = await reaction.users.fetch();
    entries = [...users.filter(u => !u.bot).keys()];
  }

  if (entries.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle('🎉 Giveaway Ended')
      .setDescription(`**Prize:** ${giveaway.prize}\n\nNo valid entries — no winners!`)
      .setTimestamp();
    await msg.edit({ embeds: [embed] });
    channel.send({ embeds: [embed] });
    return;
  }

  const winnerCount = Math.min(giveaway.winners, entries.length);
  const winners = entries.sort(() => Math.random() - 0.5).slice(0, winnerCount);
  const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

  const embed = new EmbedBuilder()
    .setColor(0x00FF7F)
    .setTitle('🎉 Giveaway Ended!')
    .setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winner(s):** ${winnerMentions}`)
    .addFields(
      { name: '👥 Total Entries', value: `${entries.length}`, inline: true },
      { name: '🏆 Winners', value: `${winnerCount}`, inline: true },
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
  channel.send({ content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`, embeds: [embed] });
  store.giveaways.delete(giveaway.messageId);
}

module.exports = {
  name: 'giveaway',
  description: 'Start or manage giveaways',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are not whitelisted.')] });
    }

    const sub = args[0]?.toLowerCase();

    // ── !giveaway start <duration> <winners> <prize> ──────────────────────────
    // Example: !giveaway start 6h 1 Free Nitro
    if (sub === 'start') {
      const duration = args[1];
      const winners  = parseInt(args[2]);
      const prize    = args.slice(3).join(' ');

      if (!duration || !parseDuration(duration)) {
        return message.reply({ embeds: [errorEmbed('Invalid Usage',
          'Usage: `!giveaway start <duration> <winners> <prize>`\nExample: `!giveaway start 6h 1 Free Nitro`'
        )] });
      }
      if (isNaN(winners) || winners < 1) {
        return message.reply({ embeds: [errorEmbed('Invalid Winners', 'Winners must be a number (e.g. `1`, `3`)')] });
      }
      if (!prize) {
        return message.reply({ embeds: [errorEmbed('Missing Prize', 'Please provide a prize name.')] });
      }

      const durationMs = parseDuration(duration);
      const endsAt = Date.now() + durationMs;

      // Delete the command message for a clean look
      try { await message.delete(); } catch (_) {}

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🎉 GIVEAWAY: ${prize}`)
        .setDescription('React with 🎉 to enter!')
        .addFields(
          { name: '🏆 Winners',   value: `${winners}`,                             inline: true },
          { name: '⏰ Duration',  value: duration,                                  inline: true },
          { name: '⌛ Ends',      value: `<t:${Math.floor(endsAt / 1000)}:R>`,     inline: true },
          { name: '👤 Hosted by', value: `<@${message.author.id}>`,                inline: true },
          { name: '📋 How to Enter', value: 'React with 🎉 below!' },
        )
        .setFooter({ text: `${winners} winner(s) • Ends` })
        .setTimestamp(endsAt);

      const gMsg = await message.channel.send({ embeds: [embed] });
      await gMsg.react(GIVEAWAY_EMOJI);

      const giveawayData = {
        guildId:   message.guild.id,
        channelId: message.channel.id,
        hostId:    message.author.id,
        prize,
        winners,
        endsAt,
        messageId: gMsg.id,
      };

      store.giveaways.set(gMsg.id, giveawayData);
      setTimeout(() => endGiveaway(message.client, giveawayData), durationMs);
      return;
    }

    // ── !giveaway end <messageId> ─────────────────────────────────────────────
    if (sub === 'end') {
      const giveaway = store.giveaways.get(args[1]);
      if (!giveaway) return message.reply({ embeds: [errorEmbed('Not Found', 'No active giveaway with that message ID.')] });
      await endGiveaway(message.client, giveaway);
      return message.reply({ embeds: [successEmbed('Giveaway Ended', 'The giveaway has been ended early.')] });
    }

    // ── !giveaway reroll <messageId> ──────────────────────────────────────────
    if (sub === 'reroll') {
      const giveaway = store.giveaways.get(args[1]);
      if (!giveaway) return message.reply({ embeds: [errorEmbed('Not Found', 'No active giveaway with that message ID.')] });
      await endGiveaway(message.client, giveaway);
      return message.reply({ embeds: [successEmbed('Rerolled', 'New winner(s) have been selected!')] });
    }

    // ── Help ──────────────────────────────────────────────────────────────────
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎉 Giveaway Commands')
      .setDescription([
        '`!giveaway start <duration> <winners> <prize>` — Start a giveaway',
        '**Example:** `!giveaway start 6h 1 Free Nitro`',
        '',
        '`!giveaway end <messageId>` — End a giveaway early',
        '`!giveaway reroll <messageId>` — Reroll winners',
      ].join('\n'))
    ] });
  },
};
