const key = 'proxy secret key';
const url = 'https://workername.domain.workers.dev';
const botToken = 'your bots token';


async function baseRequest(
  endpoint: string,
  headers: { [key: string]: string },
  method: string,
  body: string | undefined,
  requireAuth: boolean = false
): Promise<Response> {
  method = method.toUpperCase();
  let baseHeaders: { [key: string]: string } = {
    'content-type': 'application/json',
    accept: 'application/json',
    'proxy-key': key,
    'api-url': endpoint
  };
  if (requireAuth) baseHeaders['Authorization'] = `Bot ${botToken}`;
  for (const key in headers) {
    if (!baseHeaders[key]) baseHeaders[key] = headers[key];
  }
  const request = new Request(url, {
    method,
    headers: baseHeaders,
    body: body ? body : undefined
  });
  const response = await fetch(request);
  return response;
}

const embedsRemaps = {
  author: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url'
  },
  thumbnail: {
    proxyUrl: 'proxy_url'
  },
  footer: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url'
  },
  image: {
    proxyUrl: 'proxy_url'
  }
} as any;

export async function executeWebhook(
  id: string,
  token: string,
  content: string,
  embeds: Array<discord.Embed> | undefined = undefined,
  username: string | undefined = undefined,
  avatar_url: string | undefined = undefined,
  tts: boolean = false,
  allowed_mentions: discord.Message.IAllowedMentions | undefined = undefined
): Promise<boolean> {
  const url = `webhooks/${id}/${token}`;
  if (Array.isArray(embeds) && embeds.length > 0) {
    embeds = embeds.map((e: any) => {
      for (const key in embedsRemaps) {
        const value = embedsRemaps[key];
        if (typeof e[key] === 'undefined' || e[key] === null) {
          continue;
        }
        for (const prop in value) {
          const conv = value[prop];
          if (typeof e[key][prop] === 'undefined' || e[key][prop] === null) {
            continue;
          }
          e[key][conv] = e[key][prop];
          delete e[key][prop];
        }
      }
      return e;
    });
  }
  let bodyJson: { [key: string]: any } = {
    content: content,
    username: username,
    avatar_url: avatar_url,
    tts: tts ? true : undefined,
    embeds: Array.isArray(embeds) && embeds.length > 0 ? embeds : undefined,
    allowed_mentions: allowed_mentions ? allowed_mentions : undefined
  };
  for (const k in bodyJson) {
    if (typeof bodyJson[k] === 'undefined') delete bodyJson[k];
  }
  const response = await baseRequest(
    url,
    {},
    'POST',
    JSON.stringify(bodyJson),
    false
  );
  const status = response.status;
  if (status !== 204) {
    const text = await response.json();
    console.error(`Webhook - ${status} - `, text);
    return false;
  }

  return true;
}

