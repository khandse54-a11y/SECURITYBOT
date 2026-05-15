// commands/pause.js
module.exports = {
  name: 'pause',
  async execute(message, args, client) {
    const sq = client.musicQueues.get(message.guild.id);
    if (!sq || !sq.player) return message.reply('❌ Nothing is playing.');
    sq.player.pause();
    message.reply('⏸️ Paused.');
  }
};
