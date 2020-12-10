// extended slowmode, comissioned by Jack8#6482 (219514530563096576) on discord.
// essentially adds a channel permission overwrite on the channel that you define to stop users from sending messages, for the duration you specify.

type ChannelLock = {
  duration: number; // in seconds
  channelId: string; // id of the channel to apply the lock to
};
type MemberLock = {
  expires: number; // date
  id: string;
};

const kv = new pylon.KVNamespace('channelLocks');
const lockDefinitions: Array<ChannelLock> = [
  { duration: 60*60, channelId: 'your channel id' }
];

async function checkExpires() {
  const changes: { [key: string]: Array<MemberLock> | undefined } = {};
  const items = await kv.items();
  const now = Date.now();
  items.map((item) => {
    const value: Array<MemberLock> | undefined = <any>item.value;
    if (!value) return;
    const validOnly = value.filter((v) => v.expires > now);
    if (validOnly.length !== value.length) {
      if (validOnly.length === 0) {
        changes[item.key] = undefined;
      } else {
        changes[item.key] = validOnly;
      }
    }
  });
  if (Object.keys(changes).length > 0) {
    // @ts-ignore
    await kv.transactMulti<Array<MemberLock>>(Object.keys(changes), () => {
      return Object.values(changes);
    });
    // unblock them
    await Promise.all(
      Object.keys(changes).map(async (chId) => {
        const channel = await discord.getChannel(chId);
        if (
          !(channel instanceof discord.GuildTextChannel) &&
          !(channel instanceof discord.GuildNewsChannel)
        )
          return;
        const ogItem: Array<MemberLock> | undefined = <any>(
          items.find((v) => v.key === chId)?.value
        );
        if (!ogItem) return;
        const unblockedMembers = ogItem
          .filter((v) => !changes[chId]?.includes(v))
          .map((v) => v.id);
        const newOW = channel.permissionOverwrites.filter((v) => {
          if (v.type !== discord.Channel.PermissionOverwriteType.MEMBER)
            return true;
          if (!unblockedMembers.includes(v.id)) return true;
          if (v.allow === 0 && v.deny === 2048) return false;
        });
        if (newOW.length !== channel.permissionOverwrites.length) {
          await channel.edit({ permissionOverwrites: newOW });
        }
      })
    );
  }
}
discord.on('MESSAGE_CREATE', async (message) => {
  if (
    message.webhookId ||
    !message.member ||
    !(message instanceof discord.GuildMemberMessage) ||
    message.flags !== 0
  )
    return;
  const channel = await message.getChannel();
  if (channel instanceof discord.DmChannel) return;
  if(channel.canMember(message.member, discord.Permissions.MANAGE_CHANNELS) && channel.canMember(message.member, discord.Permissions.MANAGE_ROLES)) return;
  const def = lockDefinitions.find((v) => v.channelId === channel.id);
  if (!def) return;

  const { result: transactRes, next } = await kv.transactWithResult<
    Array<MemberLock>,
    boolean
  >(channel.id, (prev) => {
    const newV = prev || [];
    const memberDef = newV.find((v) => v.id === message.author.id);
    if (!memberDef) {
      return {
        next: [
          ...newV,
          { expires: def.duration * 1000, id: message.author.id }
        ],
        result: true
      };
    } else {
      return { next: newV, result: false };
    }
  });
  if (!transactRes) {
    try {
      await message.delete();
    } catch (_) {}
  } else {
    // block them!
    const newOverwrites = channel.permissionOverwrites;
    const hasOW = newOverwrites.findIndex(
      (v) =>
        v.id === message.author.id &&
        v.type === discord.Channel.PermissionOverwriteType.MEMBER
    );
    if (hasOW > -1) {
      if (
        newOverwrites[hasOW].allow === 0 &&
        newOverwrites[hasOW].deny === 2048
      ) {
        return;
      }
      newOverwrites[hasOW].allow = 0;
      newOverwrites[hasOW].deny = 2048;
    } else {
      newOverwrites.push({
        type: discord.Channel.PermissionOverwriteType.MEMBER,
        id: message.author.id,
        allow: 0,
        deny: 2048
      });
    }
    await channel.edit({ permissionOverwrites: newOverwrites });
  }
});

pylon.tasks.cron('every_5_min', '0 0/5 * * * * *', async () => {
  await checkExpires();
});
