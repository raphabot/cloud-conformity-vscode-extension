'use scrict';

const rules = require('./rules.json');

const out = rules.included.map(rule => {
  return {
    id: rule.id,
    kb: 'https://www.cloudconformity.com/knowledge-base/' + rule.provider + '/' + rule.id.split('-')[0] + '/' + rule['knowledge-base-html'] + '.html'
  };
});

console.log(JSON.stringify(out, null, 2));