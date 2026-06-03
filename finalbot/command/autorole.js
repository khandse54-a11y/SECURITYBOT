const store = require('../utils/store');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');

module.exports = {
  name: 'autorole',
  description: 'Set or remove the auto-role given to new members',
  async execute(message, args) {
    if (!store.isWhitelisted(message.author.id) && message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [errorEmbed('No Permission', 'You are **not whitelisted** to use this command.')] });
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'set') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.reply({ embeds: [errorEmbed('Invalid Role', 'Please mention a role or provide a role ID.')] });

      // Make sure bot can assign the role
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ embeds: [errorEmbed('Role Too High', 'I cannot assign this role because it is higher than my highest role.')] });
      }

      store.setAutoRole(message.guild.id, role.id);
      return message.reply({ embeds: [successEmbed('Auto-Role Set', `New members will automatically receive the **${role.name}** role when they join.`)] });
    }

    if (sub === 'remove' || sub === 'clear') {
      store.clearAutoRole(message.guild.id);
      return message.reply({ embeds: [successEmbed('Auto-Role Cleared', 'Auto-role has been disabled. New members will no longer receive an automatic role.')] });
    }

    if (sub === 'status') {
      const roleId = store.getAutoRole(message.guild.id);
      if (!roleId) return message.reply({ embeds: [infoEmbed('Auto-Role', 'Auto-role is currently **disabled**.')] });
      const role = message.guild.roles.cache.get(roleId);
      return message.reply({ embeds: [infoEmbed('Auto-Role', `Auto-role is set to **${role ? role.name : `Unknown (${roleId})`}**.`)] });
    }

    return message.reply({ embeds: [infoEmbed('Auto-Role Help', [
      '`!autorole set @role` – Set the auto-role for new members',
      '`!autorole remove` – Disable auto-role',
      '`!autorole status` – Check current auto-role',
    ].join('\n'))] });
  },
};
