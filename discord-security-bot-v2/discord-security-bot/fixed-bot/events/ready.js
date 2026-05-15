// events/ready.js
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot online as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)`);
    client.user.setActivity('🛡️ Protecting the server', { type: 3 });
  }
};
