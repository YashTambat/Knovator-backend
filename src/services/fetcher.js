const axios = require('axios');
const xml2js = require('xml2js');

async function fetchAndParse(url){
  // fetch XML and parse into array of items with desired fields
  const res = await axios.get(url, { timeout: 15000 });
  const xml = res.data;
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  const parsed = await parser.parseStringPromise(xml);
  // navigate RSS -> channel -> item
  const items = parsed?.rss?.channel?.item || parsed?.channel?.item || [];
  const arr = Array.isArray(items) ? items : [items];
  // map to normalized object
  const mapped = arr.map(it => ({
    title: it.title || '',
    link: it.link || '',
    pubDate: it.pubDate ? new Date(it.pubDate) : null,
    guid: it.guid && it.guid._ ? it.guid._ : (it.guid || ''),
    
  }));
  return mapped;
}

module.exports = { fetchAndParse };
