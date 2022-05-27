//
// leave_reaction.ts
//

const kv = new pylon.KVNamespace('leave_reaction');

type LeaveReactionData = { [key: string]: string };

export async function updateUserMessage(
  userId: string,
  channelId: string,
  messageId: string
) {
  const dt = (await kv.get<LeaveReactionData>(userId)) ?? {};
  dt[channelId] = messageId;
  await kv.put(userId, dt, { ttl: 1000 * 60 * 60 * 24 });
}

export async function onLeave(userId: string) {
  const dt = await kv.get<LeaveReactionData>(userId);
  if (!dt) return;
  await kv.delete(userId).catch((_) => {});
  for (const [channelId, messageId] of Object.entries(dt)) {
    const channel = await discord.getTextChannel(channelId);
    if (!channel) continue;
    const message = await channel.getMessage(messageId);
    await message
      ?.addReaction('server_leave:907937741109608460')
      .catch((_) => {});
  }
}












//
// main.ts
//


import * as leaveReaction from './leave_reaction';

discord.on(discord.Event.MESSAGE_CREATE, async (msg) => {
  if (msg.author.bot || msg.type !== discord.Message.Type.DEFAULT) return;
  await leaveReaction.updateUserMessage(msg.author.id, msg.channelId, msg.id);
});

discord.on(discord.Event.GUILD_MEMBER_REMOVE, async (oldMember) => {
  if (oldMember.user.bot) return;
  await leaveReaction.onLeave(oldMember.user.id);
});
