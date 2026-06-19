const https = require('https');
const fs = require('fs');

async function fetchStickers() {
  const fetchUrl = (url) => new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const res1 = await fetchUrl('https://g.tenor.com/v1/search?q=telugu+comedy&key=LIVDSRZULELA&limit=50');
  const res2 = await fetchUrl('https://g.tenor.com/v1/search?q=telugu+meme+stickers&key=LIVDSRZULELA&limit=50');
  
  let allResults = [...res1.results, ...res2.results];
  let stickerObjects = allResults.map((r, idx) => ({
    name: 'Telugu Trend ' + (idx + 1),
    path: r.media[0].gif.url
  }));

  const unique = [];
  const map = new Map();
  for (const item of stickerObjects) {
    if (!map.has(item.path)) {
      map.set(item.path, true);
      unique.push(item);
    }
  }

  let jsString = '';
  unique.slice(0, 100).forEach(s => {
    jsString += '    { name: \'' + s.name + '\', path: \'' + s.path + '\' },\n';
  });

  const filePath = 'client/src/components/StickerPicker.jsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace('// Babu Mohan (4 stickers)', '// Babu Mohan (4 stickers)\n' + jsString);
  fs.writeFileSync(filePath, content);
  console.log('Added ' + unique.slice(0, 100).length + ' stickers');
}

fetchStickers();
