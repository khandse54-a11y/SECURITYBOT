module.exports = {
  name: 'help',
  async execute(message, args, client) {
    const help = `
🛡️ **SECURITY BOT — ALL COMMANDS**

**🔒 Moderation (Whitelist Only)**
\`!ban @user [reason]\` — Ban a member
\`!kick @user [reason]\` — Kick a member
\`!timeout @user [minutes] [reason]\` — Timeout a member
\`!untimeout @user\` — Remove timeout from a member
\`!unban <userID>\` — Unban by ID

**👑 Whitelist (Owner Only)**
\`!whitelist list\` — See all whitelisted users
\`!whitelist add @user\` — Add user to whitelist
\`!whitelist remove @user\` — Remove user from whitelist

**🚨 Auto-Security (Always ON)**
- @everyone / @here ping → **INSTANT BAN**
- Links → **30 min timeout + msg deleted**
- Spam (5 msgs in 5 sec) → **10 min timeout**
- Abusive language (all languages) → **60 min timeout**
- Mass ban/kick/channel/role delete → nuker gets **INSTANT BAN**

**🔊 Voice**
\`!join\` — Join your voice channel (deafened & muted)

**ℹ️ Info**
\`!ping\` — Check bot latency
\`!help\` — Show this message
    `.trim();
    message.reply(help);
  }
};
