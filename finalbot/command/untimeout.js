// commands/untimeout.js
const store = require('../utils/store');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'untimeout',
  async execute(message, args, client) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId)
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Usage: `!untimeout @user`')] });

    try {
      await Promise.all([
        message.delete().catch(() => {}),
        target.timeout(null),
      ]);
      await target.user.send(`✅ Your timeout has been removed in **${message.guild.name}**.`).catch(() => {});
      await message.channel.send({ embeds: [successEmbed('Timeout Removed', `**${target.user.tag}**'s timeout has been removed.`)] });
    } catch (err) {
      message.channel.send({ embeds: [errorEmbed('Failed', err.message)] });
    }
  }
};
