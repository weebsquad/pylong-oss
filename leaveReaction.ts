const emojiServerJoin = 'ServerJoin:979733352967995392';
const emojiServerLeave = 'ServerLeave:979733372727361548';
const expiryHours = 24;

const kv = new pylon.KVNamespace('LeaveReaction');

type LeaveReactionData = { [key: string]: string };

discord.on(discord.Event.MESSAGE_CREATE, async (msg) => {
  if (msg.author.bot || ![discord.Message.Type.DEFAULT, discord.Message.Type.REPLY].includes(msg.type)) return;
  await onUserMessage(msg.author.id, msg.channelId, msg.id);
});

discord.on(discord.Event.GUILD_MEMBER_ADD, async (guildMember) => {
  if (guildMember.user.bot) return;
  await onUserJoin(guildMember.user.id);
});

discord.on(discord.Event.GUILD_MEMBER_REMOVE, async (guildMember) => {
  if (guildMember.user.bot) return;
  await onUserLeave(guildMember.user.id);
});

async function onUserMessage(
  userId: string,
  channelId: string,
  messageId: string
) {
  const dt = (await kv.get<LeaveReactionData>(userId)) ?? {};
  dt[channelId] = messageId;
  await kv.put(userId, dt, { ttl: 1000 * 60 * 60 * expiryHours });
}

async function onUserJoin(userId: string) {
  await updateReaction(userId, true, emojiServerJoin);
  await updateReaction(userId, false, emojiServerLeave);
}

async function onUserLeave(userId: string) {
  await updateReaction(userId, true, emojiServerLeave);
  await updateReaction(userId, false, emojiServerJoin);
}

async function updateReaction(userId: string, add: boolean, emoji: string) {
  const dt = await kv.get<LeaveReactionData>(userId);
  if (!dt) return;
  for (const [channelId, messageId] of Object.entries(dt)) {
    const channel = await discord.getTextChannel(channelId);
    if (!channel) continue;
    const message = await channel.getMessage(messageId);
    if (add) {
      await message?.addReaction(emoji).catch((_) => {});
    } else {
      await message?.deleteOwnReaction(emoji).catch((_) => {});
    }
  }
}
