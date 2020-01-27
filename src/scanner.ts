const axios = require('axios').default;
const yaml = require('js-yaml');

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

export async function scan(key:string, parsertype:string, region:string, content: string) {
  try{
    let message = "";
    const res = await axios(generateRequest(key, region, content));
    if (res.data.data === undefined || res.data.data.length === 0){
      message = "File is not a valid template.";
    }
    else {
      let data = res.data.data;
      data = trim(data);
      switch (parsertype) {
        case "table":
          message = parseToTable(data);
          break;
        case "csv":
          message = parseToCsv(data);
          break;
        case "json":
          message = JSON.stringify(data, null, 2);
          break;
        default:
          message = parseToTable(data);
          break;
      }
    }
    return message;
  }
  catch(err){
    let message = "Weird error!";
    console.error(err);
    if ((err.response) && (err.response.data)){
      if (err.response.data.errors.length === 1){
        message = err.response.data.errors[0].detail;
      }
      else{
        message = JSON.stringify(err.response.data.errors, null, 2);
      }
    }
    return message;
  }
}

const trim = (data: [object]) => {
  const errors = data.map(function(entry: any) { 
    return {
      "resource": entry.attributes.resource,
      "risk": entry.attributes['pretty-risk-level'],
      "message": entry.attributes.message,
    };
  });
  const info = errors.reduce(function(results: any, entry: any){
    let total = results[entry.risk];
    if (total){
      total+=1;
    }
    else{
      total = 1;
    }
    results[entry.risk] = total;
    return results;
  }, {});

  return {
    "info": info,
    "errors": errors
  };
};

const parseToTable = (results: any) => {
  const cTable = require('console.table');
  let table = cTable.getTable(results.info);
  table += "\n\n";
  table += cTable.getTable(results.errors);
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

const parseToCsv = (results: any) => {
  const { Parser } = require('json2csv');
  try {
    let fields = ['risk', 'quantity'];
    let csv = "risk,quantity\n";
    csv += parseInfoToCsv(results.info);
    csv += "\n\n";
    const parser = new Parser();
    csv += parser.parse(results.errors);
    return csv;
  } catch (err) {
    console.error(err);
    return err;
  }
};

const parseInfoToCsv = (info: object) => {
  let csv = "";
  const keys = Object.keys(info);
  const values = Object.values(info);
  for (let i = 0; i < keys.length; i++){
    csv += keys[i] + "," + values[i] + "\n";
  }
  return csv;
};