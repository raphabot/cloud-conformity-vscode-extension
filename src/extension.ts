import * as vscode from 'vscode';
import { CloudConformity } from 'cloud-conformity';

const VALID_OUTPUTS = ["table", "json", "csv"];

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.scan', async () => {
		const filePath = getOpenFilePath();
		logic(filePath);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.scanfilefromcontext', (uri:vscode.Uri) => {
		const filePath = uri.fsPath;
		logic(filePath);
	}));
}

const logic = async (path: string) => {
	try {
		const config = loadConfig();
		if (!isConfigValid(config)){
			const message = "Extension is not configured.";
			console.error(message);
			vscode.window.showInformationMessage(message);
		}
		else if (path === null || path === ""){
			console.log(path);
			const message = "Something went wrong.";
			console.error(message);
			vscode.window.showInformationMessage(message);
		}
		// Extension is configured.
		else{
			// Display a message box to the user
			const template = await fileContentFromPath(path);
			vscode.window.showInformationMessage("Checking...");
			const cc = new CloudConformity(config.region, config.key);
			let result = await scanTemplate(cc, config.output, template);
			vscode.window.showInformationMessage("Template scanned. ");
			let outputChannel = vscode.window.createOutputChannel("output");
			outputChannel.appendLine(result.message);
			outputChannel.show(true);
		}
	} catch (error) {
		console.error(error);
		const message = "Extension is not configured.";
		console.error(message);
		vscode.window.showInformationMessage(message);
	}
	
};

// this method is called when your extension is deactivated
export function deactivate() {}

const scanTemplate = async (cc: CloudConformity, outputType: string, template: string) => {
	let result = {
		"message": "error"
	};
	const scan = await cc.scanACloudFormationTemplateAndReturAsArrays(template);
	const trimmed = trimResults(scan.failure);
	result.message = parseResult(trimmed, outputType);
	return result;
};

const trimResults = (data: [object]) => {
	console.log(data);
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

const parseResult = (data: any, outputType: string): string => {
	let message = "";
	switch (outputType) {
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
	return message;
};

const parseToTable = (results: any) => {
  const cTable = require('console.table');
  let table = cTable.getTable(results.info);
  table += "\n\n";
  table += cTable.getTable(results.errors);
  return table;
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

const getOpenFilePath = () => {
	if (!vscode.window.activeTextEditor){
		return "";
	}
	const path = vscode.window.activeTextEditor.document.uri.fsPath;
	return path;
};

const fileContentFromPath = async (path: string) => {
	const fs = require('fs').promises;
	const data = await fs.readFile(path, "utf8");
	return data;
};

const loadConfig = () => {
	try {
		const config = vscode.workspace.getConfiguration('cc');
		const key = config.get('apikey');
		const region = config.get('region');
		const output = config.get('output');
		if ((key && key !== undefined) && (region && region !== undefined) && (output && output !== undefined)){
			return {
				key: String(key),
				region: String(region),
				output: String(output)
			};
		}
		else{
			throw new Error();
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const isConfigValid = (config: any) => {
	if (!config){
		return false;		
	}
	if (!VALID_OUTPUTS.includes(config.output)){
		return false;
	}
	return true;
};
