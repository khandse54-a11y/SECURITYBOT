const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

const GIVEAWAY_EMOJI = '🎉';

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * units[match[2]];
}

function formatDuration(ms) {
  if (ms >= 86400000) return `${ms / 86400000}d`;
  if (ms >= 3600000) return `${ms / 3600000}h`;
  if (ms >= 60000) return `${ms / 60000}m`;
  return `${ms / 1000}s`;
}

function buildGiveawayEmbed(giveaway, timeLeft) {
  const endTime = Math.floor(giveaway.endsAt / 1000);
  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🎉 GIVEAWAY: ${giveaway.prize}`)
    .setDescription(giveaway.description || 'React with 🎉 to enter!')
    .addFields(
      { name: '🏆 Winners', value: `${giveaway.winners}`, inline: true },
      { name: '⏰ Ends', value: `<t:${endTime}:R>`, inline: true },
      { name: '👤 Hosted by', value: `<@${giveaway.hostId}>`, inline: true },
      { name: '📋 How to Enter', value: 'React with 🎉 below!' },
    )
    .setFooter({ text: `${giveaway.winners} winner(s) • Ends` })
    .setTimestamp(giveaway.endsAt);
}

async function endGiveaway(client, giveaway) {
  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  let msg;
  try {
    msg = await channel.messages.fetch(giveaway.messageId);
  } catch { return; }

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
      .setDescription(`**Prize:** ${giveaway.prize}\n\nNo valid entries. No winners!`)
      .setTimestamp();
    await msg.edit({ embeds: [embed] });
    channel.send({ embeds: [embed] });
    return;
  }

  // Pick random winners
  const winnerCount = Math.min(giveaway.winners, entries.length);
  const shuffled = entries.sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, winnerCount);
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
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const sub = args[0]?.toLowerCase();

    // !giveaway start
    if (sub === 'start') {
      // Interactive prompt
      const filter = m => m.author.id === message.author.id;
      const ask = async (prompt) => {
        await message.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🎉 **Giveaway Setup** | ${prompt}`)] });
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
        return collected?.first()?.content || null;
      };

      // Duration
      const durationRaw = await ask('How long should the giveaway last? (e.g. `10m`, `1h`, `2d`)');
      if (!durationRaw) return message.channel.send({ embeds: [errorEmbed('Timed Out', 'Giveaway setup cancelled.')] });
      const durationMs = parseDuration(durationRaw.trim());
      if (!durationMs) return message.channel.send({ embeds: [errorEmbed('Invalid Duration', 'Use format like `10m`, `1h`, `2d`.')] });

      // Winners
      const winnersRaw = await ask('How many winners? (e.g. `1`, `3`)');
      if (!winnersRaw) return message.channel.send({ embeds: [errorEmbed('Timed Out', 'Giveaway setup cancelled.')] });
      const winners = parseInt(winnersRaw.trim());
      if (isNaN(winners) || winners < 1) return message.channel.send({ embeds: [errorEmbed('Invalid', 'Enter a valid number of winners.')] });

      // Prize
      const prize = await ask('What is the prize?');
      if (!prize) return message.channel.send({ embeds: [errorEmbed('Timed Out', 'Giveaway setup cancelled.')] });

      // Description
      const description = await ask('Enter a description for the giveaway (or type `none` to skip):');
      const finalDesc = (!description || description.toLowerCase() === 'none') ? 'React with 🎉 to enter!' : description;

      const endsAt = Date.now() + durationMs;

      const giveawayData = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        hostId: message.author.id,
        prize,
        description: finalDesc,
        winners,
        endsAt,
        messageId: null,
      };

      const embed = buildGiveawayEmbed(giveawayData);
      const gMsg = await message.channel.send({ embeds: [embed] });
      await gMsg.react(GIVEAWAY_EMOJI);

      giveawayData.messageId = gMsg.id;
      store.giveaways.set(gMsg.id, giveawayData);

      // Schedule end
      setTimeout(() => endGiveaway(message.client, giveawayData), durationMs);

      return;
    }

    // !giveaway end <messageId>
    if (sub === 'end') {
      const msgId = args[1];
      const giveaway = store.giveaways.get(msgId);
      if (!giveaway) return message.reply({ embeds: [errorEmbed('Not Found', 'No active giveaway with that message ID.')] });
      await endGiveaway(message.client, giveaway);
      return message.reply({ embeds: [successEmbed('Giveaway Ended', 'The giveaway has been ended early.')] });
    }

    // !giveaway reroll <messageId>
    if (sub === 'reroll') {
      const msgId = args[1];
      const giveaway = store.giveaways.get(msgId);
      if (!giveaway) return message.reply({ embeds: [errorEmbed('Not Found', 'No active giveaway with that message ID.')] });
      await endGiveaway(message.client, giveaway);
      return message.reply({ embeds: [successEmbed('Rerolled', 'New winner(s) have been selected!')] });
    }

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🎉 Giveaway Commands').setDescription([
      '`!giveaway start` – Start a new giveaway (interactive setup)',
      '`!giveaway end <messageId>` – End a giveaway early',
      '`!giveaway reroll <messageId>` – Reroll winners',
    ].join('\n'))] });
  },
};
