// commands/skip.js
module.exports = {
  name: 'skip',
  async execute(message, args, client) {
    if (!message.member.voice.channel) return message.reply('❌ Join a voice channel first!');
    const sq = client.musicQueues.get(message.guild.id);
    if (!sq || !sq.queue.length) return message.reply('❌ Nothing is playing.');
    const skipped = sq.queue[0].title;
    sq.player.stop();
    message.reply(`⏭️ Skipped **${skipped}**`);
  }
};
