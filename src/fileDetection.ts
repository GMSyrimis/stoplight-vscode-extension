import * as vscode from 'vscode';

/**
 * Supported file extensions for OpenAPI documents
 */
const OPENAPI_EXTENSIONS = ['.yaml', '.yml', '.json'];

/**
 * Regex patterns to detect OpenAPI/Swagger version declarations
 * Matches both YAML and JSON formats:
 * YAML:
 * - openapi: "3.0.0"
 * - openapi: '3.1.0'
 * - openapi: 3.0.0
 * - swagger: "2.0"
 * JSON:
 * - "openapi": "3.0.0"
 * - "swagger": "2.0"
 */
const OPENAPI_MARKER_REGEX = /["']?\s*(openapi|swagger)\s*["']?\s*:\s*['"]?[\d.]+['"]?/im;

/**
 * Checks if a file has a valid OpenAPI file extension
 * @param uri - The URI of the file to check
 * @returns true if the file has .yaml, .yml, or .json extension
 */
export function hasOpenApiExtension(uri: vscode.Uri): boolean {
  const path = uri.fsPath.toLowerCase();
  return OPENAPI_EXTENSIONS.some(ext => path.endsWith(ext));
}

/**
 * Checks if file content contains OpenAPI or Swagger version markers
 * @param content - The file content to check
 * @returns true if content contains "openapi:" or "swagger:" version declaration
 */
export function hasOpenApiMarker(content: string): boolean {
  return OPENAPI_MARKER_REGEX.test(content);
}

/**
 * Determines if a file is an OpenAPI document
 * A file is considered an OpenAPI document if:
 * 1. It has a .yaml, .yml, or .json extension, AND
 * 2. Its content contains "openapi:" or "swagger:" version declaration
 * 
 * @param uri - The URI of the file to check
 * @returns Promise<boolean> - true if the file is an OpenAPI document
 */
export async function isOpenApiDocument(uri: vscode.Uri): Promise<boolean> {
  // First check: Must have valid extension
  if (!hasOpenApiExtension(uri)) {
    return false;
  }

  try {
    // Read the file content
    const document = await vscode.workspace.openTextDocument(uri);
    const content = document.getText();

    // Second check: Must contain OpenAPI/Swagger marker
    return hasOpenApiMarker(content);
  } catch (error) {
    // If we can't read the file, it's not a valid OpenAPI document
    console.error(`Failed to read file for OpenAPI detection: ${uri.fsPath}`, error);
    return false;
  }
}

/**
 * Determines if a TextDocument is an OpenAPI document
 * Convenience method for already-opened documents
 * 
 * @param document - The TextDocument to check
 * @returns boolean - true if the document is an OpenAPI document
 */
export function isOpenApiTextDocument(document: vscode.TextDocument): boolean {
  // Check extension
  if (!hasOpenApiExtension(document.uri)) {
    return false;
  }

  // Check content for markers
  const content = document.getText();
  return hasOpenApiMarker(content);
}
