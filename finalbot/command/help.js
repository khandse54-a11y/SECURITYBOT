module.exports = {
  name: 'help',
  async execute(message, args, client) {
    const embed = {
      color: 0x7289DA,
      title: '🛡️ SECURITY BOT — ALL COMMANDS',
      fields: [
        {
          name: '🔒 Moderation (Whitelist Only)',
          value: [
            '`!ban @user [reason]` — Ban a member',
            '`!kick @user [reason]` — Kick a member',
            '`!timeout @user [minutes] [reason]` — Timeout a member',
            '`!untimeout @user` — Remove timeout',
            '`!unban <userID>` — Unban by ID',
            '`!warn @user [reason]` — Warn via DM',
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
            '• @everyone/@here → **INSTANT BAN**',
            '• Links → **30 min timeout**',
            '• Spam → **10 min timeout**',
            '• Abusive language → **60 min timeout**',
            '• Mass nuke attempt → **INSTANT BAN**',
          ].join('\n'),
        },
        {
          name: '🔊 Voice',
          value: '`!join` — Join VC (deafened & muted)',
        },
        {
          name: 'ℹ️ Info',
          value: '`!ping` — Latency | `!help` — This menu',
        },
      ],
      footer: { text: 'Security Bot — Protecting your server 24/7' },
      timestamp: new Date().toISOString(),
    };

    message.reply({ embeds: [embed] });
  }
};
