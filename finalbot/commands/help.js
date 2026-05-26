const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ SECURITY BOT — ALL COMMANDS')
      .setColor(0x7289DA)
      .addFields(
        {
          name: '🔒 Moderation (Whitelist Only)',
          value: [
            '`!ban @user [reason]` — Ban a member',
            '`!kick @user [reason]` — Kick a member',
            '`!timeout @user [minutes] [reason]` — Timeout a member',
            '`!untimeout @user` — Remove timeout from a member',
            '`!unban <userID>` — Unban by ID',
            '`!warn @user [reason]` — Warn a member via DM',
          ].join('\n'),
        },
        {
          name: '👑 Whitelist (Owner Only)',
          value: [
            '`!whitelist add @user` — Add to whitelist',
            '`!whitelist remove @user` — Remove from whitelist',
            '`!whitelist list` — See all whitelisted users',
          ].join('\n'),
        },
        {
          name: '🚨 Auto-Security (Always ON)',
          value: [
            '• @everyone/@here ping → **INSTANT BAN**',
            '• Links → **30 min timeout + msg deleted**',
            '• Spam (5 msgs/5sec) → **10 min timeout**',
            '• Abusive language → **60 min timeout**',
            '• Mass ban/kick/channel/role delete → **INSTANT BAN**',
          ].join('\n'),
        },
        {
          name: '🔊 Voice',
          value: '`!join` — Join voice channel (deafened & muted)',
        },
        {
          name: 'ℹ️ Info',
          value: [
            '`!ping` — Check bot latency',
            '`!help` — Show this message',
          ].join('\n'),
        }
      )
      .setFooter({ text: 'Security Bot — Protecting your server 24/7' })
      .s
