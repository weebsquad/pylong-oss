// React roles by metal#0666
// give thanks in pylon server for my karma whoring needs, thanks

/*
	HOW 2 USE

1. Create a new definition below by copying the first array object (or just override the first element)
2. Grab the message ID of the message you want this to trigger on (the bot will not make one for you) and place it on the definition's "message"
3. Grab the role ID of the role you want this reaction trigger to manage
4. For the emoji, if you are using a custom emoji, only place the emoji's ID in the "emoji" field, otherwise place the escaped unicode emoji in there, in order to get the escaped unicode or ID of an emoji, simply type the emoji in chat, for example :eyes: but place a \ before it, so for example \:eyes: would give you the escape code for the :eyes: emoji which you can place here.
5. Set the type of this reaction role, toggle is the "standard" reaction role, where once you add the reaction, you get the role, and when you remove it, you lose the role.
"once" will give people the role when they react, and will then delete their reaction, reacting again won't do anything for as long as they have the role
"remove" is the same as "once" except it will remove the role instead of giving it.
6. Publish/save your script
7. Go react to the message you defined with this emoji, you should see the bot react to it right away, after the bot reacts to it, it will start doing the propper role managing on that emoji.

You can define multiple emoji/roles per message!

*/



const definitions = [
  {
    role: 'roleId',
    message: 'messageId',
    emoji: 'emojiId(custom) or emoji unicode',
    type: 'once / remove / toggle'
  },
  {
    emoji: '👀',
    role: '710127316117749852',
    message: '751080754901024900',
    type: 'once'
  }
];

function isNumber(n: string) {
  return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

const cooldowns: { [key: string]: number } = {};
export async function handleReactRoles(
  reaction:
    | discord.Event.IMessageReactionAdd
    | discord.Event.IMessageReactionRemove,
  add: boolean
) {
  if (!reaction.member) return;
  const { member } = reaction;
  if (member.user.bot === true) {
    return;
  }
  const message = reaction.messageId;
  const { emoji } = reaction;
  const found = definitions.find((definitions) => {
    if (
      typeof definitions.message !== 'string' ||
      typeof definitions.role !== 'string' ||
      typeof definitions.emoji !== 'string' ||
      typeof definitions.type !== 'string'
    ) {
      return false;
    }
    const type = definitions.type.toLowerCase();
    if (type !== 'once' && type !== 'toggle' && type !== 'remove') {
      return false;
    }
    if (definitions.message !== message) {
      return false;
    }
    if (isNumber(definitions.emoji)) {
      return typeof emoji.id === 'string' && definitions.emoji === emoji.id;
    }
    return typeof emoji.name === 'string' && emoji.name === definitions.emoji;
  });
  if (!found) {
    return;
  }

  const type = found.type.toLowerCase();
  if (type === 'remove' && add === false) {
    return;
  }
  if (type === 'once' && add === false) {
    return;
  }

  const channel = await discord.getChannel(reaction.channelId);
  if (
    !(channel instanceof discord.GuildTextChannel) &&
    !(channel instanceof discord.GuildNewsChannel)
  ) {
    return;
  }

  let msg: discord.Message | null;
  try {
    msg = await channel.getMessage(reaction.messageId);
  } catch (e) {
    return;
  }
  if (msg === null) {
    return;
  }

  const hasMyEmoji = msg.reactions.find((react) => {
    if (react.me === false) {
      return false;
    }
    if (emoji.type === discord.Emoji.Type.GUILD) {
      return emoji.id === react.emoji.id;
    }
    return emoji.name === react.emoji.name;
  });
  if (
    typeof hasMyEmoji !== 'undefined' &&
    add === true &&
    (type === 'once' || type === 'remove')
  ) {
    try {
      msg.deleteReaction(
        emoji.type === discord.Emoji.Type.GUILD
          ? `${emoji.name}:${emoji.id}`
          : `${emoji.name}`,
        reaction.userId
      );
    } catch (e) {}
  }
  if (typeof cooldowns[reaction.userId] === 'number') {
    const diff = Date.now() - cooldowns[reaction.userId];
    if (diff < 500) {
      return;
    }
  }
  cooldowns[reaction.userId] = Date.now();

  if (!hasMyEmoji) {
    const emjMention = found.emoji;
    // await msg.deleteAllReactionsForEmoji(emoji.type === discord.Emoji.Type.GUILD ? `${emoji.name}:${emoji.id}` : `${emoji.name}`);
    await msg.addReaction(
      emoji.type === discord.Emoji.Type.GUILD
        ? `${emoji.name}:${emoji.id}`
        : `${emoji.name}`
    );
    return;
  }
  const guild = await discord.getGuild();
  const memNew = await guild.getMember(reaction.userId);
  if (memNew === null) {
    return;
  }
  let typeRole: undefined | boolean;
  if (type === 'once' && !memNew.roles.includes(found.role)) {
    await memNew.addRole(found.role);
    typeRole = true;
  } else if (type === 'remove' && memNew.roles.includes(found.role)) {
    await memNew.removeRole(found.role);
    typeRole = false;
  } else if (type === 'toggle') {
    if (memNew.roles.includes(found.role) && add === false) {
      await memNew.removeRole(found.role);
      typeRole = false;
    } else if (!memNew.roles.includes(found.role) && add === true) {
      await memNew.addRole(found.role);
      typeRole = true;
    }
  }
}
discord.on(
  discord.Event.MESSAGE_REACTION_ADD,
  async (reaction: discord.Event.IMessageReactionAdd) => {
    await handleReactRoles(reaction, true);
  }
);

discord.on(
  discord.Event.MESSAGE_REACTION_REMOVE,
  async (reaction: discord.Event.IMessageReactionRemove) => {
    await handleReactRoles(reaction, false);
  }
);
