// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as templateScanner from './scanner';

const VALID_OUTPUTS = ["table", "json", "csv"];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Cloud Conformity extension is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

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
			console.log(message);
			vscode.window.showInformationMessage(message);
		}
		else if (path === null || path === ""){
			console.log(path);
			const message = "Something went wrong.";
			console.log(message);
			vscode.window.showInformationMessage(message);
		}
		// Extension is configured.
		else{
			// Display a message box to the user
			const template = await fileContentFromPath(path);
			vscode.window.showInformationMessage("Checking...");
			let result = await scanTemplate(config.key, config.output, config.region, template);
			vscode.window.showInformationMessage("Template scanned. ");
			let outputChannel = vscode.window.createOutputChannel("output");
			outputChannel.appendLine(result.message);
			outputChannel.show(true);
		}
	} catch (error) {
		const message = "Extension is not configured.";
		error.log(message);
		vscode.window.showInformationMessage(message);
	}
	
};

// this method is called when your extension is deactivated
export function deactivate() {}

const scanTemplate = async (key:string, output:string, region:string, template: string) => {
	let result = {
		"message": "error"
	};
	const scan = await templateScanner.scan(key, output, region, template);
	result.message = String(scan);
	return result;
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
