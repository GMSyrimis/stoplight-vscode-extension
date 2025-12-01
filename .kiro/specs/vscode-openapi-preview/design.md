# Design Document

## Overview

The VSCode OpenAPI Preview extension provides real-time visual feedback for OpenAPI specification files by embedding Stoplight Elements in a VSCode webview panel. The extension monitors file changes, parses OpenAPI documents, and renders them using Stoplight Elements' web components. The architecture follows VSCode's extension patterns with a clear separation between the extension host (Node.js) and webview (browser) contexts.

## Architecture

The extension follows a simple architecture within VSCode, delegating all OpenAPI parsing and rendering to Stoplight Elements:

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Extension Activation & Commands                       │ │
│  │  - activate()                                          │ │
│  │  - registerCommands()                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Preview Manager                                       │ │
│  │  - createPreview()                                     │ │
│  │  - updatePreview()                                     │ │
│  │  - disposePreview()                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  File Watcher                                          │ │
│  │  - watchFile()                                         │ │
│  │  - debounceChanges()                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ postMessage(fileContent)         │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Webview Panel                                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  HTML + Stoplight Elements                       │ │ │
│  │  │  - Header with layout/options controls           │ │ │
│  │  │  - <elements-api apiDescriptionDocument={...} /> │ │ │
│  │  │  (Stoplight handles all parsing & rendering)     │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Extension Entry Point

**File**: `src/extension.ts`

```typescript
interface ExtensionContext {
  subscriptions: Disposable[];
  extensionPath: string;
}

function activate(context: ExtensionContext): void;
function deactivate(): void;
```

Responsibilities:
- Register commands for opening preview
- Initialize preview manager
- Set up file system watchers
- Handle extension lifecycle

### 2. Preview Manager

**File**: `src/previewManager.ts`

```typescript
interface PreviewManager {
  createOrShowPreview(document: TextDocument): Promise<void>;
  updatePreview(document: TextDocument): Promise<void>;
  dispose(): void;
}

interface PreviewPanel {
  panel: WebviewPanel;
  document: TextDocument;
  disposables: Disposable[];
}
```

Responsibilities:
- Manage webview panel lifecycle
- Track active preview panels
- Handle panel visibility and focus
- Coordinate updates between editor and webview

### 3. File Content Reader

**File**: `src/fileReader.ts`

```typescript
interface FileReader {
  readFile(uri: Uri): Promise<string>;
  detectFileType(uri: Uri): 'yaml' | 'json' | 'unknown';
}
```

Responsibilities:
- Read file content from disk
- Detect file format (YAML vs JSON)
- Pass raw content to webview (Stoplight handles parsing)

### 4. File Watcher

**File**: `src/fileWatcher.ts`

```typescript
interface FileWatcher {
  watch(uri: Uri, callback: (content: string) => void): Disposable;
}
```

Responsibilities:
- Monitor file changes in the editor
- Trigger preview updates when file content changes
- Handle file deletion events

### 5. Webview Content Provider

**File**: `src/webviewContent.ts`

```typescript
interface WebviewContentProvider {
  getHtmlContent(
    webview: Webview,
    extensionUri: Uri,
    fileContent: string
  ): string;
}

interface StoplightOptions {
  layout: 'sidebar' | 'stacked' | 'responsive';
  hideTryIt: boolean;
  hideSchemas: boolean;
}
```

Responsibilities:
- Generate HTML for webview with Stoplight Elements
- Include header navigation for layout/option controls
- Inject Stoplight Elements scripts and styles
- Configure Content Security Policy
- Handle resource URIs for bundled Stoplight assets

### 6. Command Handler

**File**: `src/commands.ts`

```typescript
interface CommandHandler {
  openPreview(uri?: Uri): Promise<void>;
  openPreviewToSide(uri?: Uri): Promise<void>;
}
```

Responsibilities:
- Handle command palette commands
- Determine target document
- Validate file type
- Invoke preview manager

## Data Models

### Preview State

```typescript
interface PreviewState {
  documentUri: string;
  fileContent: string;
  lastUpdate: number;
  stoplightOptions: StoplightOptions;
}
```

### Extension Configuration

```typescript
interface ExtensionConfig {
  defaultLayout: 'sidebar' | 'stacked' | 'responsive';
  defaultHideTryIt: boolean;
  defaultHideSchemas: boolean;
  previewColumn: 'beside' | 'active';
}
```

### Webview Message Types

```typescript
// Extension → Webview
interface UpdateMessage {
  type: 'update';
  content: string;
  timestamp: number;
}

interface OptionsMessage {
  type: 'options';
  options: StoplightOptions;
}

// Webview → Extension
interface ReadyMessage {
  type: 'ready';
}

interface ErrorMessage {
  type: 'error';
  message: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria and simplifying based on Stoplight handling parsing:
- File recognition properties (3.1, 3.2, 3.5) → Combined into single detection property
- Version support properties (5.1, 5.2, 5.3) → Combined (Stoplight handles all versions)
- Error handling properties (2.4, 7.1-7.5) → Simplified (Stoplight handles OpenAPI errors, we handle file system errors)
- Reference resolution (8.1-8.3) → Simplified (Stoplight handles $ref resolution)
- Command availability (3.3, 3.4) → Combined into single bidirectional property
- Debouncing (2.3) → Removed (not needed for simplicity)
- Change detection timing (2.1) → Merged with content sync (2.2)
- Multi-file support (8.4) → Simplified to single active file

### Correctness Properties

**Property 1: Preview creation for valid documents**
*For any* valid OpenAPI document (YAML or JSON), when the preview command is triggered, a preview panel should be created and contain rendered API documentation.
**Validates: Requirements 1.1**

**Property 2: Stoplight Elements integration**
*For any* preview panel created, the webview HTML should contain the Stoplight Elements web component (elements-api or equivalent integration).
**Validates: Requirements 1.4**

**Property 3: Rendering completeness**
*For any* valid OpenAPI document with N endpoints and M schemas, the rendered preview should reference all N endpoints and all M schemas.
**Validates: Requirements 1.5**

**Property 4: Content synchronization**
*For any* OpenAPI document, when the file content changes, the preview should update to reflect the new content.
**Validates: Requirements 2.1, 2.2**

**Property 5: Error resilience**
*For any* document content (valid or invalid), the extension should pass it to Stoplight Elements without crashing, allowing Stoplight to display appropriate content or error messages.
**Validates: Requirements 2.4**

**Property 8: OpenAPI file detection**
*For any* file with .yaml, .yml, or .json extension, if it contains "openapi:" or "swagger:" version declarations, the extension should recognize it as an OpenAPI document; otherwise it should not.
**Validates: Requirements 3.1, 3.2, 3.5**

**Property 9: Command availability**
*For any* file, preview commands should be enabled if and only if the file is recognized as an OpenAPI document.
**Validates: Requirements 3.3, 3.4**

**Property 10: Column separation**
*For any* preview creation, the preview panel should appear in a different editor column than the source document.
**Validates: Requirements 4.1**

**Property 11: Adjacent column placement**
*For any* editor state with N columns, when a preview is opened, it should appear in column N+1 or an adjacent column.
**Validates: Requirements 4.2**

**Property 12: Column position persistence**
*For any* preview, if closed and then reopened for the same document, it should appear in the same column position.
**Validates: Requirements 4.4**

**Property 13: Multi-version support**
*For any* valid OpenAPI 3.0, OpenAPI 3.1, or Swagger 2.0 specification, the extension should render it without errors.
**Validates: Requirements 5.1, 5.2, 5.3**

**Property 14: Unsupported version handling**
*For any* document with an unsupported or missing version declaration, the extension should display an error message indicating the version issue.
**Validates: Requirements 5.4**

**Property 15: Load time performance**
*For any* preview panel creation, Stoplight Elements should load and render within 2 seconds.
**Validates: Requirements 6.1**

**Property 16: Resource injection**
*For any* webview initialization, the generated HTML should include the necessary Stoplight Elements JavaScript and CSS resources.
**Validates: Requirements 6.2**

**Property 17: Error display without crashing**
*For any* document content (valid or invalid), the extension should display the content in Stoplight Elements without crashing, allowing Stoplight to show its own error messages for invalid OpenAPI.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

**Property 18: File reading error handling**
*For any* file that cannot be read (not found, permission denied), the extension should display a clear error message in the preview panel without crashing.
**Validates: Requirements 7.4**

**Property 19: Reference resolution**
*For any* OpenAPI document with $ref references, Stoplight Elements should handle resolution (the extension passes the raw content and Stoplight handles refs).
**Validates: Requirements 8.1, 8.2, 8.3**

Note: Properties 17-19 are simplified because Stoplight Elements handles all OpenAPI parsing, validation, and reference resolution. The extension's responsibility is to pass raw file content and handle file system errors gracefully.

**Property 20: Single file preview**
*For any* OpenAPI file, the extension should support creating a preview for the currently active file.
**Validates: Requirements 8.4**

## Error Handling

### Error Categories

1. **File Reading Errors**
   - File not found
   - Permission denied
   - File too large
   - Strategy: Display error in preview panel, suggest resolution

2. **Stoplight Rendering Errors**
   - Invalid OpenAPI content (handled by Stoplight)
   - Parse errors (handled by Stoplight)
   - Validation errors (handled by Stoplight)
   - Strategy: Stoplight Elements displays its own error messages, we just ensure they're visible

3. **Webview Errors**
   - Webview creation failure
   - Resource loading failure
   - Script initialization timeout
   - Strategy: Graceful degradation, show error state

4. **File System Errors**
   - File deleted while preview open
   - File moved/renamed
   - Workspace folder closed
   - Strategy: Handle gracefully, show appropriate message or close preview

### Error Display Strategy

**Extension-level errors** (file reading, webview creation) should be displayed in the preview panel:

```
┌─────────────────────────────────────┐
│  ⚠️  Error Type                     │
│                                     │
│  Clear description of the issue     │
│                                     │
│  Suggestion for resolution          │
└─────────────────────────────────────┘
```

**OpenAPI parsing/validation errors** are handled entirely by Stoplight Elements - it has built-in error display for invalid specifications.

## Testing Strategy

### Testing Strategy

The extension will use **Chrome DevTools MCP server** for automated testing of the webview HTML content.

#### Webview Content Tests

Focus on verifying the HTML content generated for the webview:

1. **Stoplight Elements Loading**
   - Verify Stoplight Elements scripts are included
   - Verify Stoplight Elements CSS is included
   - Verify the elements-api component is present in the DOM

2. **Layout and Documentation Rendering**
   - Verify API documentation renders in the webview
   - Verify layout controls (sidebar/stacked/responsive) work
   - Verify header navigation controls are present
   - Verify Try It panel visibility toggle works
   - Verify Schemas visibility toggle works

3. **Content Updates**
   - Verify webview updates when file content changes
   - Verify new content is displayed (not stale content)

#### Testing Approach

Use Chrome DevTools MCP to:
- Take snapshots of the webview DOM
- Verify presence of Stoplight Elements components
- Verify API documentation is rendered
- Verify header controls are functional
- Test layout switching
- Test content updates

#### Unit Tests (Minimal)

Basic unit tests for:
- File reading logic
- OpenAPI file detection (checking for "openapi:" or "swagger:" markers)
- HTML generation structure

## Implementation Notes

### Stoplight Elements Integration

The extension will use the **published `@stoplight/elements` npm package** with the web component approach:

- Install `@stoplight/elements` from npm (version 9.0.12 or later)
- Bundle `web-components.min.js` and `styles.min.css` from the package
- Use `<elements-api>` custom element in the webview
- Pass OpenAPI document content as a property to the web component

This approach provides:
- Smaller bundle size (no React runtime needed)
- Simpler integration
- Official published package with updates and support

### Extension Location

The extension will be created in a new directory: `vscode-extension/`

This location:
- Keeps the extension separate from the main Stoplight Elements packages
- Won't interfere with the existing monorepo build process
- Can optionally be added to workspaces if needed for development

### Webview Communication

Communication between extension and webview:

```typescript
// Extension → Webview: Send raw file content
webview.postMessage({
  type: 'update',
  content: fileContentString,  // Raw YAML/JSON string
  timestamp: Date.now()
});

// Extension → Webview: Update Stoplight options
webview.postMessage({
  type: 'options',
  options: {
    layout: 'sidebar',
    hideTryIt: false,
    hideSchemas: false
  }
});

// Webview → Extension
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.type) {
    case 'ready':
      // Webview initialized, Stoplight loaded
      break;
    case 'error':
      // Error occurred (file system, not Stoplight parsing)
      break;
  }
});
```

### Content Security Policy

The webview will use a strict CSP to prevent security issues:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               script-src ${webview.cspSource} 'unsafe-inline'; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               img-src ${webview.cspSource} https: data:; 
               font-src ${webview.cspSource};">
```

### Performance Optimizations

1. **Lazy Activation**: Extension activates only when OpenAPI files are opened or commands are triggered
2. **Debouncing**: File changes debounced to 500ms to avoid excessive updates
3. **Incremental Updates**: Only update webview when document actually changes
4. **Resource Caching**: Stoplight Elements resources loaded once and reused
5. **Disposal**: Proper cleanup of watchers, panels, and event listeners

### Configuration Options

Users can configure the extension via VSCode settings:

```json
{
  "openapi-preview.defaultLayout": "sidebar",
  "openapi-preview.previewColumn": "beside",
  "openapi-preview.defaultHideTryIt": false,
  "openapi-preview.defaultHideSchemas": false
}
```

### Header Navigation

The webview will include a simple header with controls to adjust Stoplight options:

```
┌─────────────────────────────────────────────────────────┐
│  Layout: [Sidebar ▼] [☐ Hide Try It] [☐ Hide Schemas] │
└─────────────────────────────────────────────────────────┘
│                                                         │
│              Stoplight Elements Rendering               │
│                                                         │
```

These controls update the Stoplight Elements component properties in real-time.

## Installation and Publishing

### Local Development

The extension README will include instructions for:

1. **Installing dependencies**
   ```bash
   cd vscode-extension
   npm install
   ```

2. **Building the extension**
   ```bash
   npm run build
   ```

3. **Running locally in VSCode**
   - Open the `vscode-extension` folder in VSCode
   - Press F5 to launch Extension Development Host
   - Open an OpenAPI file and test the preview

4. **Installing locally**
   ```bash
   npm run package  # Creates .vsix file
   code --install-extension openapi-preview-x.x.x.vsix
   ```

### Publishing

The README will include instructions for:

1. **Publishing to VSCode Marketplace**
   - Create publisher account at https://marketplace.visualstudio.com
   - Get Personal Access Token from Azure DevOps
   - Use `vsce` to publish:
     ```bash
     npm install -g @vscode/vsce
     vsce publish
     ```

2. **Publishing to Open VSX Registry** (for VSCodium, etc.)
   - Create account at https://open-vsx.org
   - Get access token
   - Use `ovsx` to publish:
     ```bash
     npm install -g ovsx
     ovsx publish
     ```

3. **GitHub Releases**
   - Create GitHub release with .vsix file attached
   - Users can download and install manually
