const axios = require('axios').default;

const generateRequest = (key:string, region:string, content: string) => {
  const REGION = region;
  const BASE_URL = "https://" + REGION + "-api.cloudconformity.com/v1";
  return {
    baseURL: BASE_URL,
    url: '/template-scanner/scan',
    method: 'post',
    headers: {
      'Content-Type': 'application/vnd.api+json',
      'Authorization': 'ApiKey ' + key
    },
    responseType: 'json',
    data: {
      'data': {
        'attributes': {
          'type': 'cloudformation-template',
          'contents': content
        }
      }
    }
  };
};

export async function scan(key:string, region:string, content: string) {
  try{
    if (isJsonString(content)){
      let message = "";
      const res = await axios(generateRequest(key, region, content));
      if (res.data.data === undefined || res.data.data.length === 0){
        message = "File is not a valid template.";
      }
      else {
        message = parser(JSON.stringify(res.data, null, 2));
      }
      return message;
    }
  }
  catch(err){
    console.error(err);
    if ((err.response) && (err.response.data)){
      return err.response.data;
    }
    return "Weird error!";
  }
}

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (err) {
    console.error(err);
    return false;
  }
  return true;
};

const parser = (cc_output: string) => {

  const results = JSON.parse(cc_output).data;
  const errors = results.map(function(entry: any) { 
    return {
      "resource": entry.attributes.resource,
      "risk": entry.attributes['pretty-risk-level'],
      "message": entry.attributes.message,
    };
  });
  const cTable = require('console.table');
  const table = cTable.getTable(errors.sort(sortByHigherRisk).reverse());
  return table;
};

const sortByHigherRisk = (a: string, b: string) => {
  const scaleA = riskToScale(a);
  const scaleB = riskToScale(b);
  if (scaleA < scaleB) {
    return -1;
  }
  if (scaleA > scaleB) {
    return 1;
  }
  // a must be equal to b
  return 0;
};

const riskToScale = (risk: string) =>{
  let scale = 0;
  switch (risk) {
    case 'Very High':
      scale = 4;
      break;
    case 'High':
      scale = 3;
      break;
    case 'Medium':
      scale = 2;
      break;
    case 'Low':
      scale = 1;
      break;
    default:
      break;
  }
  return scale;
};