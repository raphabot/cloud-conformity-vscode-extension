const https = require('https');
const fs = require('fs');

const generateKb = async (rulesObj) => {
  const data = rulesObj.data;
  const rules = rulesObj.included;

  const kb = data.map(entry => {
    const output = entry.relationships.rules.data.map((rule) => {
      const id = rule.id;
      const foundRule = rules.find(element => element.id === id);
      //console.log(`${entry.attributes.provider}, ${entry.attributes.name}, ${id}, ${foundRule.title}`);
      return {
        id: id,
        kb: `https://www.cloudconformity.com/knowledge-base/${foundRule.provider}/${entry.attributes.name}/${foundRule[`knowledge-base-html`]}.html`
      };
    });
    return output;
  });
  fs.writeFileSync('src/kb.json', JSON.stringify(kb.flat(1), null, 2), { flag: 'wx' });  
};

const options = {
  hostname: 'us-west-2-api.cloudconformity.com',
  port: 443,
  path: '/v1/services',
  method: 'GET',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `ApiKey ${process.env.CONFORMITY_APIKEY}`
  }
};

const req = https.get(options,  (resp) => {
  let data = '';

  // A chunk of data has been received.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    const rulesObj = JSON.parse(data);
    //console.log(JSON.stringify(rulesObj, null, 2));
    generateKb(rulesObj);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
