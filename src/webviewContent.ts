import * as vscode from 'vscode';

/**
 * Options for configuring Stoplight Elements display
 * Note: Layout is fixed to 'sidebar' for consistency
 */
export interface StoplightOptions {
  // Layout is always 'sidebar' - no longer configurable
}

/**
 * Generates HTML content for the webview with Stoplight Elements integration
 * 
 * @param webview - The webview instance for generating resource URIs
 * @param extensionUri - The extension's URI for loading resources
 * @param fileContent - The raw OpenAPI file content (YAML or JSON string)
 * @param errorMessage - Optional error message to display instead of content
 * @returns HTML string for the webview
 */
export function getHtmlContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  contentUrl: string,
  errorMessage?: string
): string {
  // Get URIs for the Stoplight Elements resources
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'web-components.min.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'styles.min.css')
  );

  // Generate a nonce for inline scripts (security)
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; 
                 script-src ${webview.cspSource} 'nonce-${nonce}'; 
                 style-src ${webview.cspSource} 'unsafe-inline'; 
                 img-src ${webview.cspSource} https: data:; 
                 font-src ${webview.cspSource};
                 connect-src http://localhost:* ${webview.cspSource};">
  <title>OpenAPI Preview</title>
  <link rel="stylesheet" href="${styleUri}">
  <style nonce="${nonce}">
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    
    #content {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    
    #elements {
      width: 100%;
      height: 100%;
    }
    
    /* Reduce padding in the right content panel */
    /* Override Stoplight's large padding classes (sl-px-24 = 96px) */
    elements-api .sl-px-24 {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
    
    /* Add vertical padding */
    elements-api .sl-overflow-y-auto {
      padding-top: 16px !important;
      padding-bottom: 16px !important;
    }
    
    /* Target the main content container */
    elements-api .sl-flex-1.sl-w-full {
      padding: 16px !important;
    }
    
    /* Reduce padding in nested content divs */
    elements-api .sl-flex-1.sl-w-full > div {
      padding: 16px !important;
    }
    
    /* Override Stoplight Elements CSS variables */
    elements-api {
      --padding: 16px;
      --spacing: 16px;
    }
    
    #error-container {
      padding: 20px;
      text-align: center;
    }
    
    .error-message {
      color: var(--vscode-errorForeground);
      background-color: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 16px;
      border-radius: 4px;
      margin: 20px auto;
      max-width: 600px;
    }
    
    .error-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div id="content">
    <div id="error-container" style="display: ${errorMessage ? 'block' : 'none'};">
      <div class="error-message">
        <div class="error-title">Error Loading Preview</div>
        <div id="error-text">${errorMessage || ''}</div>
      </div>
    </div>
    <elements-api
      id="elements"
      apiDescriptionUrl="${contentUrl}"
      layout="sidebar"
      router="hash"
      style="display: ${errorMessage ? 'none' : 'block'}; width: 100%; height: 100%;"
    />
  </div>

  <script src="${scriptUri}"></script>
  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      let elementsApi = document.getElementById('elements');
      const errorContainer = document.getElementById('error-container');
      const errorText = document.getElementById('error-text');

      // Listen for messages from the extension
      window.addEventListener('message', event => {
        try {
          const message = event.data;
          
          switch (message.type) {
            case 'update':
              // Recreate the element with updated URL to force reload
              try {
                console.log('Received update message (v0.2.1), recreating element...');
                
                // Get current URL and add cache-busting timestamp
                const currentUrl = elementsApi.getAttribute('apiDescriptionUrl');
                const baseUrl = currentUrl.split('?')[0]; // Remove existing query params
                const newUrl = baseUrl + '?t=' + Date.now();
                
                console.log('New URL:', newUrl);
                
                // Remove the old element
                const parent = elementsApi.parentNode;
                const nextSibling = elementsApi.nextSibling;
                parent.removeChild(elementsApi);
                
                // Create a new elements-api element
                const newElement = document.createElement('elements-api');
                newElement.id = 'elements';
                newElement.setAttribute('apiDescriptionUrl', newUrl);
                newElement.setAttribute('layout', 'sidebar');
                newElement.setAttribute('router', 'hash');
                newElement.style.cssText = 'display: block; width: 100%; height: 100%;';
                
                // Insert the new element
                if (nextSibling) {
                  parent.insertBefore(newElement, nextSibling);
                } else {
                  parent.appendChild(newElement);
                }
                
                // Update reference
                elementsApi = newElement;
                
                errorContainer.style.display = 'none';
                console.log('Preview recreated successfully');
              } catch (error) {
                console.error('Update error:', error);
                showError('Failed to update preview: ' + error.message);
              }
              break;
              
            case 'error':
              // Display error message
              showError(message.message);
              break;
              
            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error handling message from extension:', error);
          showError('An unexpected error occurred: ' + error.message);
        }
      });

      function showError(message) {
        errorText.textContent = message;
        errorContainer.style.display = 'block';
        elementsApi.style.display = 'none';
      }

      // Global error handler to catch unhandled errors from Stoplight Elements
      window.addEventListener('error', (event) => {
        console.error('Unhandled error in webview:', event.error);
        // Don't show every error to the user, just log it
        // Stoplight Elements will handle its own OpenAPI parsing errors
        event.preventDefault(); // Prevent the error from crashing the webview
      });

      // Global promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection in webview:', event.reason);
        event.preventDefault(); // Prevent the rejection from crashing the webview
      });

      // Notify extension that webview is ready
      vscode.postMessage({ type: 'ready' });
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates a random nonce for Content Security Policy
 * @returns A random nonce string
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Escapes a string for safe embedding in HTML attributes
 * Uses HTML entities to preserve whitespace and special characters
 * @param str - The string to escape
 * @returns The escaped string
 */
function escapeForJson(str: string): string {
  return str
    .replace(/&/g, '&amp;')    // Must be first to avoid double-escaping
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')   // Newline as HTML entity
    .replace(/\r/g, '&#13;')   // Carriage return as HTML entity
    .replace(/\t/g, '&#9;');   // Tab as HTML entity
}

/**
 * Gets default Stoplight options from VSCode configuration
 * 
 * Note: Layout is fixed to 'sidebar' and no longer configurable.
 * All layout-related configuration options have been removed.
 * 
 * @returns Default StoplightOptions (currently empty as layout is fixed)
 */
export function getDefaultOptions(): StoplightOptions {
  return {};
}
