# Non Official Cloud Conformity VSCode Extension

This is a extension with a simple implementation of Cloud Conformity template scanner right from the IDE.

![Extension working on VSCode](extension.gif)

## Features

This extension has a really simple feature: a preventative measure to ensure your AWS infrastructure remains compliant by detecting risks in template files before they are launched into AWS.

More info about the scanner over [here](https://github.com/cloudconformity/documentation-api/blob/master/TemplateScanner.md).

You can scan either the current open file through:
> "Cloud Conformity: Scan Current Open File As a CloudFormation Template."

You can scan any other template right-clicking the file and:
> "Cloud Conformity: Scan Selected CloudFormation Template File"

## Requirements

You *need* to configure your API Key and you *might* need to configuer the endpoint region, as it defaults to us-west-2. 

## Extension Settings

This extension contributes the following settings:

* `cc.apikey`: a string with your Cloud Conformity apikey
* `cc.region`: Defaults to `us-west-2`. Change it to your Cloud Conformity used endpoint. 
* `cc.output`: Defaults to `table`. Valid options are `table`, `json` or `csv`. 

## Known Issues

It works only for JSON Templates right now.

## Release Notes

### 0.0.4

Support for YAML based templates.

### 0.0.3

Support to different types of outputs. Added a summary of 

### 0.0.2

Fixed output for 500 errors.

### 0.0.1

Initial release.
