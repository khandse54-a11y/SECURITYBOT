module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Account age check — ban accounts under 7 days old
    const AGE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;
    const accountAge   = Date.now() - member.user.createdTimestamp;
    if (accountAge < AGE_LIMIT_MS) {
      try {
        await member.user.send(
          `🚫 Your account is too new to join **${member.guild.name}**.\n` +
          `Please wait until your account is at least 7 days old.`
        ).catch(() => {});
        await member.kick('🔒 Account too new — under 7 days old');
        const ch = member.guild.channels.cache.find(
          c => c.isTextBased() && ['mod-log','security-log','bot-log','logs'].includes(c.name)
        );
        if (ch) ch.send(`👶 **KICKED NEW ACCOUNT:** <@${member.user.id}> (\`${member.user.tag}\`) — account age: ${Math.floor(accountAge / 86400000)} days`).catch(() => {});
      } catch {}
    }
  }
};
