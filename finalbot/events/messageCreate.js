const { isWhitelisted } = require('../utils/whitelist');

const spamMap = new Map();
const SPAM_LIMIT       = 5;
const SPAM_WINDOW_MS   = 5000;
const SPAM_TIMEOUT_MS  = 10 * 60 * 1000;
const ABUSE_TIMEOUT_MS = 60 * 60 * 1000;

const ABUSIVE_WORDS = [
  // English
  'fuck','shit','bitch','bastard','dick','cunt','nigger',
  'faggot','retard','whore','slut','asshole','motherfucker','fucker',
  // Hindi/Urdu
  'harami','kamina','chutiya','bhosdike','madarchod','laude','randi','mkc',
  'bhosdi','maderchod','bsdk','mc','bc','behenchod','gaandu','gandu',
  'lodu','lawde','choot','bhenchod','saala','kutte','haramzada',
  'ullu','bakwaas','gandii','lund','chakka','hijra','chodi','chodd',
];

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const member = message.member;
    if (!member) return;

    const userId  = message.author.id;
    const content = message.content.toLowerCase();

    // ── COMMAND HANDLER ───────────────────────────────────────────────────
    const prefix = process.env.PREFIX || '!';
    if (message.content.startsWith(prefix)) {
      const args        = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command     = client.commands.get(commandName);
      if (command) {
        try { await command.execute(message, args, client); }
        catch (err) { console.error(`[CMD ERROR] ${commandName}:`, err.message); }
      }
      return;
    }

    // ── 1. @EVERYONE / @HERE → IMMEDIATE DELETE + BAN ────────────────────
    if (message.mentions.everyone) {
      if (isWhitelisted(userId)) return;

      await Promise.all([
        message.delete().catch(() => {}),
        member.ban({ deleteMessageSeconds: 0, reason: '🔒 Anti-Nuke: Unauthorized @everyone/@here ping' })
          .catch(err => console.error('[EVERYONE BAN ERROR]', err.message)),
      ]);

      await logAction(message.guild,
        `🚫 **BANNED** <@${userId}> (\`${message.author.tag}\`) — pinged @everyone/@here in <#${message.channel.id}>`
      );
      return;
    }

    // Whitelisted users bypass spam & abuse checks
    if (isWhitelisted(userId)) return;

    // ── 2. SPAM → 10 MIN TIMEOUT + DELETE ────────────────────────────────
    const now  = Date.now();
    const data = spamMap.get(userId) || { count: 0, first: now };

    if (now - data.first > SPAM_WINDOW_MS) {
      spamMap.set(userId, { count: 1, first: now });
    } else {
      data.count++;
      spamMap.set(userId, data);

      if (data.count >= SPAM_LIMIT) {
        spamMap.delete(userId);
        try {
          await Promise.all([
            message.delete().catch(() => {}),
            member.timeout(SPAM_TIMEOUT_MS, '🔒 Anti-Spam: Too many messages'),
          ]);
          await message.channel.send(
            `⏱️ <@${userId}> has been **timed out for 10 minutes** for spamming.`
          ).catch(() => {});
          await logAction(message.guild,
            `⏱️ **TIMEOUT 10min** <@${userId}> — spamming in <#${message.channel.id}>`
          );
        } catch (err) { console.error('[SPAM TIMEOUT ERROR]', err.message); }
        return;
      }
    }

    // ── 3. ABUSIVE LANGUAGE → 60 MIN TIMEOUT + DELETE ────────────────────
    const hasAbuse = ABUSIVE_WORDS.some(w => content.includes(w));
    if (hasAbuse) {
      try {
        await Promise.all([
          message.delete().catch(() => {}),
          member.timeout(ABUSE_TIMEOUT_MS, '🔒 Language filter: Abusive language'),
        ]);
        await message.channel.send(
          `🤐 <@${userId}> has been **timed out for 60 minutes** for using abusive language.`
        ).catch(() => {});
        await logAction(message.guild,
          `🤐 **TIMEOUT 60min** <@${userId}> — abusive language in <#${message.channel.id}>`
        );
      } catch (err) { console.error('[ABUSE TIMEOUT ERROR]', err.message); }
    }
  }
};

async function logAction(guild, msg) {
  const ch = guild.channels.cache.find(
    c => c.isTextBased() && ['mod-log','security-log','bot-log','logs'].includes(c.name)
  );
  if (ch) ch.send(`[🛡️ Security] ${msg}`).catch(() => {});
}
