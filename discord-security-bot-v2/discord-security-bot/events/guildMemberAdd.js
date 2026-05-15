// events/guildMemberAdd.js
module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    console.log(`[JOIN] ${member.user.tag} joined ${member.guild.name}`);
  }
};
