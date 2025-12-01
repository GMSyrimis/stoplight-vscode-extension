# OpenAPI Preview Extension

A VSCode extension that provides live preview of OpenAPI specifications using Stoplight Elements.

## What It Does

- **Live Preview**: View your OpenAPI/Swagger documentation as you edit
- **Beautiful Rendering**: Uses Stoplight Elements for professional API documentation
- **Sidebar Layout**: Clean navigation with endpoints and schemas
- **Auto-Detection**: Automatically recognizes OpenAPI files
- **Live Updates**: Preview updates automatically when you save changes

## Running Locally

### 1. Install Dependencies
```bash
cd vscode-extension
npm install
```

### 2. Build the Extension
```bash
npm run build
```

### 3. Test in Development Mode
- Open the `vscode-extension` folder in VSCode/Kiro/Cursor
- Press `F5` (or Run > Start Debugging)
- A new "Extension Development Host" window opens
- Open any OpenAPI file (try `test-samples/valid-openapi.yaml`)
- Click the preview button in the toolbar or use Command Palette: "OpenAPI: Open Preview"

### 4. Development with Auto-Rebuild (Optional)
```bash
npm run watch
```
Keep this running, then press `F5` to test. Changes rebuild automatically.

## Packaging as Extension

### Create .vsix File
```bash
npm run package
```
This creates `openapi-preview-0.1.0.vsix`

### Install the Extension
```bash
# VSCode
code --install-extension openapi-preview-0.1.0.vsix

# Cursor
cursor --install-extension openapi-preview-0.1.0.vsix
```

Or install via Command Palette:
1. `Cmd+Shift+P` / `Ctrl+Shift+P`
2. "Extensions: Install from VSIX"
3. Select the `.vsix` file

## Usage

1. Open an OpenAPI file (`.yaml`, `.yml`, or `.json`)
2. File must contain `openapi:` or `swagger:` keyword
3. Click preview button in toolbar or use Command Palette: "OpenAPI: Open Preview"

## Configuration

Set in VSCode settings:
```json
{
  "openapi-preview.previewColumn": "beside"  // or "active"
}
```

## Requirements

- VSCode/Kiro/Cursor 1.75.0+
- Node.js 18+

## Troubleshooting

**Build fails?**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Preview not showing?**
- Check file contains `openapi:` or `swagger:`
- Check file extension is `.yaml`, `.yml`, or `.json`
- Check Output panel (View > Output > Extension Host) for errors

**Blank preview?**
```bash
ls dist/webview/  # Should show web-components.min.js and styles.min.css
npm run build     # Rebuild if files missing
```
