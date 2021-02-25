import * as vscode from 'vscode';
import { CloudConformity } from 'cloud-conformity';
import * as path from 'path';

const VALID_OUTPUTS = ["table", "json", "csv", "tab"];
const KB = require('./kb.json');

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.scan', async () => {
		const filePath = getOpenFilePath();
		logic(filePath, context);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.scanfilefromcontext', (uri:vscode.Uri) => {
		const filePath = uri.fsPath;
		logic(filePath, context);
	}));
}

const logic = async (path: string, context: vscode.ExtensionContext) => {
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
			let result = await scanTemplate(cc, config.output, template, config.profileId, config.accountId, context);
			vscode.window.showInformationMessage("Template scanned.");
			let outputChannel = vscode.window.createOutputChannel("output");
			outputChannel.appendLine(result.message);
			outputChannel.show(true);
		}
	} catch (error) {
		console.error(error);
		const message = "Something went wrong.";
		console.error(message);
		vscode.window.showInformationMessage(message);
	}
	
};

// this method is called when your extension is deactivated
export function deactivate() {}

const scanTemplate = async (cc: CloudConformity, outputType: string, template: string, profileId: string, accountId: string, context: vscode.ExtensionContext) => {
	let result = {
		"message": "error"
	};
	const scan = await cc.scanACloudFormationTemplateAndReturAsArrays(template, "cloudformation-template", profileId, accountId);
	// If there are findings
	if (scan.failure.length){
		const trimmed = trimResults(scan.failure);
		result.message = parseResult(trimmed, outputType, context);
	}
	else {
		result.message = "This is a Well-Architected template. Great job!";
	}
	return result;
};

const trimResults = (data: any[]) => {
	console.log(data);
	const errors = data
		.map(function(entry: any) { 
			return {
				"resource": entry.attributes.resource,
				"risk": entry.attributes['pretty-risk-level'],
				"message": entry.attributes.message,
				"kb": getKBLink(entry)
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

const parseResult = (data: any, outputType: string, context: vscode.ExtensionContext): string => {
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
		case "tab":
			outputAsNewTab(data, context);
			message = "Results on new tab!";
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
		const accountId = config.get('defaultAccountId');
		const profileId = config.get('defaultProfileId');
		if ((key && key !== undefined) && (region && region !== undefined) && (output && output !== undefined)){
			return {
				key: String(key),
				region: String(region),
				output: String(output),
				...(profileId as  object) && {profileId: String(profileId)},
				...!profileId && accountId && {accountId: String(accountId)},
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

const outputAsNewTab = (data: any, context: vscode.ExtensionContext) => {
	// Create and show panel
	const panel = vscode.window.createWebviewPanel(
		'scanResult', // Identifies the type of the webview. Used internally
		'Scan Result', // Title of the panel displayed to the user
		vscode.ViewColumn.One, // Editor column to show the new webview panel in.
		{} // Webview options. More on these later.
	);
	// Get path to resource on disk
	const cssDiskPath = vscode.Uri.file(
		path.join(context.extensionPath, 'css', 'bootstrap.min.css')
	);

	// And get the special URI to use with the webview
	const cssPath = panel.webview.asWebviewUri(cssDiskPath);

	const html = `<!DOCTYPE html>
	<html lang="en">
	<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Scan Result</title>
			<link rel="stylesheet" href="${cssPath}" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
	</head>
	<body class="bg-dark text-white">
		<div class="container bg-dark text-white">
			<h2>Template Scanning Report</h2>
			<br>
			${generateTabHTML(data)}
		</div>
	</body>
	</html>`;
	console.log(html);
	// And set its HTML content
	panel.webview.html = html;
};

const generateTabHTML = (data: any) => {
	const infoHtml = `
	<h3>Summary</h3>
	<table class="table table-dark">
		<thead>
			<tr>
				<th scope="col">Risk</th>
				<th scope="col">Findings</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<th scope="row"><font color="ff0000">Extreme</font></th>
				<td>${data.info.Extreme? data.info.Extreme : 0}</td>
			</tr>
			<tr>
				<th scope="row"><font color="ff4200">Very High</font></th>
				<td>${data.info['Very High']? data.info['Very High'] : 0}</td>
			</tr>
			<tr>
				<th scope="row"><font color="ff8300">High</font></th>
				<td>${data.info.High? data.info.High : 0}</td>
			</tr>
			<tr>
				<th scope="row"><font color="yellow">Medium</font></th>
				<td>${data.info.Medium? data.info.Medium : 0}</td>
			</tr>
			<tr>
				<th scope="row"><font color="green">Low</font></th>
				<td>${data.info.Low? data.info.Low : 0}</td>
			</tr>
		</tbody>
	</table>
	<br>`;
	const resultsHtml = data.errors.reduce((html: string, detection: any) => {
		return `${html}
		<tr>
			<th scope="row">${detection.resource}</th>
			<td>${colorByRisk(detection.risk)}</td>
			<td><a href="${detection.kb}">${detection.message}</a></td>
		</tr>`;
	}, `
	<h3>Detections</h3>
	<table class="table table-dark">
	<thead>
		<tr>
			<th scope="col">Resource</th>
			<th scope="col">Risk</th>
			<th scope="col">Message</th>
		</tr>
	</thead>
	<tbody>`) + `</tbody>
	</table>`;
	return infoHtml + resultsHtml;
};

const colorByRisk = (risk: string) => {
	if (risk === 'Extreme'){
		return `<font color="ff0000">Extreme</font>`;
	}
	if (risk === 'Very High'){
		return `<font color="ff4200">Very High</font>`;
	}
	if (risk === 'High'){
		return `<font color="ff8300">High</font>`;
	}
	if (risk === 'Medium'){
		return `<font color="yellow">Medium</font>`;
	}
	else if (risk === 'Low') {
		return `<font color="green">Low</font>`;
	}
	return risk;
};