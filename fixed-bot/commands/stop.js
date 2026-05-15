// commands/stop.js
module.exports = {
  name: 'stop',
  async execute(message, args, client) {
    if (!message.member.voice.channel) return message.reply('❌ Join a voice channel first!');
    const sq = client.musicQueues.get(message.guild.id);
    if (!sq) return message.reply('❌ Nothing is playing.');
    sq.queue = [];
    try { sq.player.stop(); } catch {}
    try { sq.connection.destroy(); } catch {}
    client.musicQueues.delete(message.guild.id);
    message.reply('⏹️ Stopped music and left the voice channel.');
  }
};
