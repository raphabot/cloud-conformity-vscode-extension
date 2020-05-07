import * as vscode from 'vscode';
import { CloudConformity } from 'cloud-conformity';

const VALID_OUTPUTS = ["table", "json", "csv"];
const KB = require('./kb.json');

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
			vscode.window.showInformationMessage("Scanning template...");

			// Check if Serverless Framework
			if (checkIfServerlessFramework(path)){
				path = getServerlessCloudFormationTemplate(path);
				const fs = require("fs");
				if (!fs.existsSync(path)){
					const message = "You haven't packaged or deployed your Serverless application yet.";
					vscode.window.showInformationMessage(message);
					return;
				}
			}
			console.log(path);
			const template = await fileContentFromPath(path);
			const cc = new CloudConformity(config.region, config.key);
			let result = await scanTemplate(cc, config.output, template);
			vscode.window.showInformationMessage("Template scanned.");
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
	// If there are findings
	if (scan.failure.length){
		const trimmed = trimResults(scan.failure);
		result.message = parseResult(trimmed, outputType);
	}
	else {
		result.message = "This is a Well-Architected template. Great job!";
	}
	return result;
};

const trimResults = (data: [object]) => {
	console.log(data);
	const errors = data
		.map(function(entry: any) { 
			return {
				"resource": entry.attributes.resource,
				"risk": entry.attributes['pretty-risk-level'],
				"message": entry.attributes.message,
				// "kb": getKBLink(entry)
			};
		})
		.sort(compare);
	let info = errors.reduce(function(results: any, entry: any){
		results[entry.risk] += 1;
		return results;
	}, {
		'Extreme': 0,
		'Very High': 0,
		'High': 0,
		'Medium': 0,
		'Low': 0
	});
	//Remove any risk-type with 0 entries
	info = Object.fromEntries(
		Object.entries(info).filter(([risk, qty]) => qty !== 0)
	);

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
	const Table = require('cli-table');
	let infoTable = new Table();
	Object.keys(results.info).forEach(key => {
		let value = results.info[key];
		infoTable.push({[key]: value});
	});
  let resultsTable = new Table({
		head: ['Resource', 'Risk', 'Message']//, 'Knowledge Base']
	});
	results.errors.map( (error: any) => {
		resultsTable.push([
			error.resource,
			error.risk,
			error.message,
			//error.kb
		]);
	});
  return "Detections Summary\n" + infoTable.toString() + "\n\nDetails\n" + resultsTable.toString();
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

const fileContentFromPath = async (path: string): Promise<string> => {
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

const compare = (a: {resource: string; risk: string; message: string} , b: {resource: string; risk: string; message: string}): number => {
	const ra = riskToNumber(a.risk);
	const rb = riskToNumber(b.risk);
	if ( ra <= rb){
		return 1;
	}
	return -1;
};

const riskToNumber = (risk: string): number => {
	switch (risk) {
		case 'Extreme':
			return 4;
		case 'Very High':
			return 3;
		case 'High':
			return 2;
		case 'Medium':
			return 1;
		default:
			return 0;
	}
};

const getKBLink = (check: any) => {
	return KB.find((kb: { id: string; kb: string}) => kb.id === check.relationships.rule.data.id).kb;
};

const checkIfServerlessFramework = (filePath: string): boolean => {
	const path = require('path');
	const fileName = path.basename(filePath);
	if ((fileName === 'serverless.yml') || (fileName === 'serverless.yaml')){
		return true;
	}
	return false;
};

const generateServerlessCloudFormationTemplate = async (filePath: string): Promise<boolean | string> => {
	const isServerlessInstalled = await execShellCommand('which serverless');
	if (isServerlessInstalled){
		const command = `cd ${filePath} && serverless package`;
		const result = await execShellCommand(command);
		if (result){
			return getServerlessCloudFormationTemplate(filePath);
		}
	}
	return false;
};

const getServerlessCloudFormationTemplate = (filePath: string): string => {
	const path = filePath.substring(0, filePath.lastIndexOf('/'));
	console.log(path);
	return `${path}/.serverless/cloudformation-template-update-stack.json`;
};

/**
 * Executes a shell command and return it as a Promise.
 * FROM: https://medium.com/@ali.dev/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd: string) {
	const exec = require('child_process').exec;
	return new Promise((resolve, reject) => {
	 exec(cmd, (error: Error, stdout: string, stderr: string) => {
		if (error) {
		 console.warn(error);
		}
		resolve(stdout? stdout : stderr);
	 });
	});
 }