const { antinukeCheck } = require('../utils/antinuke');
const store = require('../utils/store');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const guild = newMember.guild;

    // Check if roles were added
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size === 0 && removedRoles.size === 0) return;

    const logs = await guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null); // 25 = MEMBER_ROLE_UPDATE
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

    const executorId = entry.executor?.id;
    if (!executorId || executorId === client.user.id) return;

    // Whitelisted and owner are fine
    if (store.isWhitelisted(executorId) || executorId === guild.ownerId) return;

    // Non-whitelisted user tried to modify roles → instant ban + revert
    const nuked = await antinukeCheck(
      guild,
      executorId,
      `Unauthorized role modification on <@${newMember.id}>`,
      async () => {
        // Revert: remove added roles, restore removed roles
        try {
          if (addedRoles.size > 0) await newMember.roles.remove(addedRoles, 'Anti-Nuke: Reverting unauthorized role add');
          if (removedRoles.size > 0) await newMember.roles.add(removedRoles, 'Anti-Nuke: Reverting unauthorized role remove');
        } catch (_) {}
      }
    );

    // Even if not at threshold yet, immediately ban for trying to touch roles
    if (!nuked && !store.isWhitelisted(executorId) && executorId !== guild.ownerId) {
      try {
        await guild.bans.create(executorId, {
          reason: '🔒 Security: Non-whitelisted user attempted to modify member roles.',
        });
        store.markBanned(executorId);

        // Revert roles
        try {
          if (addedRoles.size > 0) await newMember.roles.remove(addedRoles, 'Anti-Nuke: Reverting unauthorized role add');
          if (removedRoles.size > 0) await newMember.roles.add(removedRoles, 'Anti-Nuke: Reverting unauthorized role remove');
        } catch (_) {}

        const logChannel = guild.systemChannel
          || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));

        if (logChannel) {
          const { warnEmbed } = require('../utils/embeds');
          logChannel.send({
            embeds: [warnEmbed(
              '🚨 Unauthorized Role Modification',
              `<@${executorId}> tried to modify roles on <@${newMember.id}> without being whitelisted.\n\n**Action:** Instant ban + roles reverted.`
            )]
          }).catch(() => {});
        }
      } catch (_) {}
    }
  },
};
