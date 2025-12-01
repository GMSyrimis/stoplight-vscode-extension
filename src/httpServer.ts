import * as http from 'http';
import * as vscode from 'vscode';

/**
 * Simple HTTP server to serve OpenAPI content to webviews
 * This allows Stoplight Elements to fetch content via URL instead of inline attributes
 */
export class HttpServer {
  private server: http.Server | undefined;
  private port: number = 0;
  private contentMap: Map<string, string> = new Map();

  /**
   * Starts the HTTP server on a random available port
   * @returns Promise that resolves with the server URL
   */
  async start(): Promise<string> {
    if (this.server) {
      return this.getServerUrl();
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS for webview access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.writeHead(405);
          res.end('Method Not Allowed');
          return;
        }

        // Extract document ID from URL path (e.g., /doc/abc123)
        const match = req.url?.match(/^\/doc\/([^/]+)/);
        if (!match) {
          console.log(`HTTP 404: Invalid path ${req.url}`);
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        const docId = match[1];
        const content = this.contentMap.get(docId);

        if (!content) {
          console.log(`HTTP 404: Document not found for ID ${docId}`);
          console.log(`Available IDs: ${Array.from(this.contentMap.keys()).join(', ')}`);
          res.writeHead(404);
          res.end('Document Not Found');
          return;
        }
        
        console.log(`HTTP 200: Serving document ${docId}, length: ${content.length}`);

        // Determine content type based on content
        const contentType = content.trim().startsWith('{') 
          ? 'application/json' 
          : 'text/yaml';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
      });

      // Listen on random available port
      this.server.listen(0, 'localhost', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          console.log(`OpenAPI HTTP server started on port ${this.port}`);
          resolve(this.getServerUrl());
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.server.on('error', (error) => {
        console.error('HTTP server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Registers content for a document and returns its URL
   * @param documentUri - The URI of the document
   * @param content - The OpenAPI content
   * @returns The URL to access this content
   */
  registerContent(documentUri: string, content: string): string {
    // Use a hash of the URI as the document ID
    const docId = Buffer.from(documentUri).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
    
    this.contentMap.set(docId, content);
    const url = `${this.getServerUrl()}/doc/${docId}`;
    console.log(`Registered content for ${docId}, URL: ${url}, content length: ${content.length}`);
    return url;
  }

  /**
   * Updates content for an existing document
   * @param documentUri - The URI of the document
   * @param content - The new OpenAPI content
   */
  updateContent(documentUri: string, content: string): void {
    const docId = Buffer.from(documentUri).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
    
    this.contentMap.set(docId, content);
    console.log(`Updated content for ${docId}, content length: ${content.length}`);
  }

  /**
   * Removes content for a document
   * @param documentUri - The URI of the document
   */
  removeContent(documentUri: string): void {
    const docId = Buffer.from(documentUri).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
    
    this.contentMap.delete(docId);
  }

  /**
   * Gets the base URL of the server
   */
  private getServerUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Stops the HTTP server and cleans up resources
   */
  dispose(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
      this.contentMap.clear();
      console.log('OpenAPI HTTP server stopped');
    }
  }
}
