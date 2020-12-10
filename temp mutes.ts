/*
	Pylon Instructional tempmutes codebase
	This is more-or-less for learning purposes and not for actual use on your server, because
	 for actual use you'll need a lot more checks & safety than this.

*/
	
const muteRole = 'YOUR MUTE ROLE ID';

const muteKv = new pylon.KVNamespace('mutes');
const commandsAdmin = new discord.command.CommandGroup({
  defaultPrefix: '!',
  filters: discord.command.filters.isAdministrator()
});

async function TempMute(member: discord.GuildMember, duration: number) {
  // add the actual mute role to the user
  if (!member.roles.includes(muteRole)) await member.addRole(muteRole);
  // store our expiration time for the mute
  await muteKv.put(member.user.id, Date.now() + duration, {
    ifNotExists: true
  });
}

async function UnMute(member: discord.GuildMember) {
  // remove the mute role from the user if they have it
  if (member.roles.includes(muteRole)) await member.removeRole(muteRole);
  // delete our stored kv
  await muteKv.delete(member.user.id);
}

// let's check our task every 5 minutes
pylon.tasks.cron('Every_5_Min', '0 0/5 * * * * *', async () => {
  const now = Date.now();
  // get all our items of potentially muted users
  const items = await muteKv.items();
  // get our guild object
  const guild = await discord.getGuild();
  let toRemove: string[] = [];
  // loop thru every item to see if it expired
  await Promise.all(
    items.map(async (val) => {
      const member = await guild.getMember(val.key);
      // if the member is no longer on your server, or no longer has the mute role, let's remove it
      if (member === null || !member.roles.includes(muteRole)) {
        toRemove.push(val.key);
        return;
      }
      if (typeof val.value !== 'number') return; // type safety check
      const diff = now - val.value;
      if (diff > 0) {
        // The mute has expired!
        await member.removeRole(muteRole);
        toRemove.push(val.key);
      }
    })
  );
  // clean our KVs for expired mutes
  if (toRemove.length > 0) {
    // @ts-ignore
    await muteKv.transactMulti(toRemove, () => undefined);
  }
});

commandsAdmin.on(
  'mute',
  (ctx) => ({
    member: ctx.guildMember(),
    duration: ctx.integer({ minValue: 1, maxValue: 1000000 })
  }),
  async (msg, { member, duration }) => {
    await msg.reply(async () => {
      if (member.roles.includes(muteRole))
        return 'The target is already muted!';
      await TempMute(member, duration * 1000 * 60);
      return `${
        discord.decor.Emojis.WHITE_CHECK_MARK
      } ${member.toMention()} was muted for ${duration} minutes!`;
    });
  }
);

commandsAdmin.on(
  'unmute',
  (ctx) => ({
    member: ctx.guildMember()
  }),
  async (msg, { member }) => {
    await msg.reply(async () => {
      if (!member.roles.includes(muteRole)) return 'The target is not muted!';
      await UnMute(member);
      return `${
        discord.decor.Emojis.WHITE_CHECK_MARK
      } ${member.toMention()} was un-muted!`;
    });
  }
);
