[![vsm-version](https://img.shields.io/visual-studio-marketplace/v/raphaelbottino.cc-template-scanner?style=flat&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=raphaelbottino.cc-template-scanner)
[![Build Status](https://travis-ci.org/raphabot/cloud-conformity-vscode-extension.svg?branch=master)](https://travis-ci.org/raphabot/cloud-conformity-vscode-extension)
[![Coverage Status](https://coveralls.io/repos/github/raphabot/cloud-conformity-vscode-extension/badge.svg?branch=master)](https://coveralls.io/github/raphabot/cloud-conformity-vscode-extension?branch=master)

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
> "Cloud One Conformity: Scan Current Open Template."

2 - You can scan any other template right-clicking the file and selecting:
> "Cloud One Conformity: Scan Selected Template."

#### Atention Serverless Framework Users!
>If you are using the extension to scan Serverless Framework templates, make sure to package your application before running the scan.


## Known Issues

None. Please, open an issue if you find one!

## Contribute

Pull Requests are encouraged!

## Release Notes

### 0.2.0
 - Serverless Framework support.

### 0.1.3
 - Proper message if the template is clean
 - Order the detections by risk level.

### 0.1.2
- Bug fixes

### 0.1.1

- Adding an icon to the extension.
- Better README.md

### 0.1.0

- First public release
