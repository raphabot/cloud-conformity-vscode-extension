# Non Official Cloud Conformity VSCode Extension

This is a extension with a simple implementation of Cloud Conformity template scanner right from the IDE.

![Extension working on VSCode](images/extension.gif)

## Features

This extension has a really simple feature: a preventative measure to ensure your AWS infrastructure remains compliant by detecting risks in template files before they are launched into AWS.

More info about the scanner over [here](https://github.com/cloudconformity/documentation-api/blob/master/TemplateScanner.md).

## Requirements

You ***need*** to configure your API Key and you ***might*** need to configuer the endpoint region, as it defaults to us-west-2.  To do so, see the Extension Settings below:

## Extension Settings

This extension contributes the following settings:

* `cc.apikey`: a string with your Cloud Conformity apikey
* `cc.region`: Defaults to `us-west-2`. Change it to your Cloud Conformity used endpoint. 
* `cc.output`: Defaults to `table`. Valid options are `table`, `json` or `csv`. 

If you need help on how to edit these settings, you can find more info [here](https://code.visualstudio.com/docs/getstarted/settings).

## How to Use It?

First, open VS Code Command Palette (⇧⌘P on Mac or Ctrl+⇧+P on Windows). Then:

1 - You can scan the current open file through:
> "Cloud Conformity: Scan Current Open File As a CloudFormation Template."

2 - You can scan any other template right-clicking the file and selecting:
> "Cloud Conformity: Scan Selected CloudFormation Template File"


## Known Issues

None. Please, open an issue if you find one!

## Release Notes

### 0.1.1

- Adding an icon to the extension.
- Better README.md

### 0.1.0

- First public release
