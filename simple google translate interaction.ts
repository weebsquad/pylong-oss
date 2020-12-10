const key = 'YOUR_API_KEY';
// follow this guide to get a gcloud api key https://cloud.google.com/translate/docs/basic/setup-basic
// then go to gcloud console -> api -> credentials and copy it from there.
const endpointTranslate =
  'https://translation.googleapis.com/language/translate/v2';
const endpointDetect =
  'https://translation.googleapis.com/language/translate/v2/detect';

export function formParams(params: any) {
  var esc = encodeURIComponent;
  var query = Object.keys(params)
    .map((k) => esc(k) + '=' + esc(params[k]))
    .join('&');
  return query;
}

function formGAPIParams(key: string, query: string, target: string) {
  let params = {
    q: query,
    target: target,
    format: 'text',
    key: key
  };
  return formParams(params);
}

async function translate(query: string, target: string) {
  let queryParams = '?' + formGAPIParams(key, query, target);
  let fullUrl = `${endpointTranslate}${queryParams}`;
  let req = new Request(fullUrl, {
    method: 'POST'
  });
  let request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    console.error(request.error);
    throw new Error();
  }
  if (
    !Array.isArray(request.data.translations) ||
    request.data.translations.length !== 1
  ) {
    console.error(request);
    throw new Error();
  }
  return request.data.translations[0];
}

export async function detectLanguage(query: string) {
  let params = {
    q: query,
    key: key
  };
  let queryParams = '?' + formParams(params);
  let fullUrl = `${endpointDetect}${queryParams}`;
  let req = new Request(fullUrl, {
    method: 'POST'
  });
  let request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    console.error(request.error);
    throw new Error();
  }
  if (!Array.isArray(request.data.detections) || request.data.detections < 1) {
    console.error(request);
    throw new Error();
  }
  return request.data.detections[0];
}

const commands = new discord.command.CommandGroup({
  defaultPrefix: '!'
});

commands.on(
  'translate',
  (ctx) => ({ lang: ctx.string(), text: ctx.text() }),
  async (message, { lang, text }) => {
    let translation = await translate(text, lang);
    let sourceLang = translation.detectedSourceLanguage;
    let targetLang = lang;
    let ll = sourceLang?.name ?? translation.detectedSourceLanguage;
    let targ = targetLang ?? lang;
    const richEmbed = new discord.Embed();
    richEmbed.setThumbnail({
      url:
        'https://icons-for-free.com/iconfiles/png/512/language+text+translate+translation+icon-1320183416086707155.png',
      height: 128,
      width: 128
    });
    richEmbed
      .setTitle(`${ll} ${discord.decor.Emojis.ARROW_RIGHT} ${targ}`)
      .setColor(0x00ff00);
    richEmbed.setDescription(translation.translatedText);
    richEmbed.setFooter({
      iconUrl: message.member.user.getAvatarUrl(),
      text: `Requested by ${message.member.user.getTag()} (${
        message.member.user.id
      })`
    });
    richEmbed.setTimestamp(new Date().toISOString());
    await message.reply(async () => {
      return { embed: richEmbed };
    });
  }
);