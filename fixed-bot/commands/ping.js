// commands/ping.js
module.exports = {
  name: 'ping',
  async execute(message, args, client) {
    const sent = await message.reply('🏓 Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    sent.edit(`🏓 **Pong!**\n📶 Bot Latency: \`${latency}ms\`\n💡 API Latency: \`${Math.round(client.ws.ping)}ms\``);
  }
};
