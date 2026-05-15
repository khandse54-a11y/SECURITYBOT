// commands/help.js
module.exports = {
  name: 'help',
  async execute(message, args, client) {
    const help = `
🛡️ **SECURITY BOT — ALL COMMANDS**

**🔒 Moderation (Whitelist Only — works in ALL channels)**
\`!ban @user [reason]\` — Ban a member
\`!kick @user [reason]\` — Kick a member
\`!timeout @user [minutes] [reason]\` — Timeout a member
\`!unban <userID>\` — Unban by ID

**👑 Whitelist (Owner Only)**
\`!whitelist list\` — See all whitelisted users
\`!whitelist add @user\` — Add user to whitelist (bypasses all security)
\`!whitelist remove @user\` — Remove user from whitelist

**🚨 Auto-Security (Always ON — ALL channels public + private)**
• @everyone / @here ping → user gets **BANNED**
• Spam (5 msgs in 5 sec) → **10 min timeout**
• Abusive language → **60 min timeout**
• Mass ban attempt → nuker gets **BANNED + roles stripped**
• Mass channel delete → nuker gets **BANNED + roles stripped**
• Mass role delete → nuker gets **BANNED + roles stripped**

**🎵 Music (Anyone Can Use)**
\`!play <song name or YouTube URL>\` — Play a song
\`!skip\` — Skip current song
\`!stop\` — Stop music and leave voice
\`!queue\` — Show song queue
\`!pause\` — Pause playback
\`!resume\` — Resume playback

**ℹ️ Info**
\`!ping\` — Check bot latency
\`!help\` — Show this message
    `.trim();
    message.reply(help);
  }
};
