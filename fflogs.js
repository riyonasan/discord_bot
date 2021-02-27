const ENV = require('dotenv').config().parsed;
const axios = require('axios');
const Enumerable = require('linq');
const { JSDOM } = require('jsdom');

const FFLOGS_API_KEY = ENV.API_KEY;

getColor = (perf => {
  switch (true) {
    case (perf < 25):
      return 0x666
    case (perf < 50):
      return 0x1eff00
    case (perf < 75):
      return 0x0070ff 
    case (perf < 95):
      return 0xa335ee
    case (perf < 99):
      return 0xff8000
    case (perf == 99):
      return 0xe268a8
    case (perf == 100):
      return 0xe5cc80
  };
});

getCharacterInfo = (async url => {
  const {data} = await axios({
    method       : 'GET', 
    url          : url, 
    responseType : 'document', 
  });
  const dom = new JSDOM(data);
  const characterName = dom.window.document.querySelector('#character-name').textContent;
  const worldName = dom.window.document.querySelector('#guild-and-server').textContent.match(/[a-zA-Z]+/)[0];
  const faceLink = dom.window.document.querySelector('#character-portrait-image').getAttribute('src');
  const portraitElm = dom.window.document.querySelector('#character-tall-portrait');
  const portraitStyle = portraitElm.currentStyle
    || dom.window.document.defaultView.getComputedStyle(portraitElm, '');
  const portraitLink = portraitStyle.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

  return {characterName, worldName, faceLink, portraitLink};
});


exports.getCharactarStatistics = (async logsUrl =>{
  const {characterName, worldName, faceLink, portraitLink} = await getCharacterInfo(logsUrl);
  const {
    data
  } = await axios.get(encodeURI(`https://www.fflogs.com:443/v1/rankings/character/${characterName}/${worldName}/JP?metric=dps&partition=1&timeframe=historical&api_key=${FFLOGS_API_KEY}`));

  const stats = Enumerable.from(data)
    .where(x => x.characterName === characterName)
    .groupBy(
      x => x.encounterName,
      null,
      (key, g) => {
        return {
          encounterName: key,
          percentile: Math.floor(g.max(x => x.percentile)),
          total: g.orderByDescending(x => x.percentile).first().total,
          reportID: g.orderByDescending(x => x.percentile).first().reportID,
          fightID: g.orderByDescending(x => x.percentile).first().fightID,
        };
      }
    )
    .toArray();
  console.log(stats)

  const maxPerf = Math.max(...stats.map(s => s.percentile));
  const maxColor = getColor(maxPerf);
  const embed = {
    embed: {
      author: {
        name: characterName,
        url: logsUrl,
        icon_url: faceLink
      },
      description: `*World: ${worldName}*`,
      color: maxColor,
      // timestamp: new Date(),
      image: {
      url: portraitLink
      },
      fields: []
    }
  };

  stats.forEach(data => {
    embed.embed.fields.push({
      name: `${data.encounterName}`,
      value: `[\`\`\`Best: ${data.percentile}%\rrDPS: ${data.total}\`\`\`](https://ja.fflogs.com/reports/${data.reportID}#fight=${data.fightID}&type=summary)`,
      inline: true
    });
  });

  return embed;
});