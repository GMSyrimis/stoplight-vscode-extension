# Implementation Plan

- [x] 1. Set up VSCode extension project structure
  - Create `vscode-extension/` directory in repo root
  - Initialize extension project with TypeScript
  - Configure package.json with extension metadata and activation events
  - Set up build configuration (webpack to bundle extension and Stoplight Elements)
  - Add `@stoplight/elements` as dependency from npm
  - Create README.md with installation and publishing instructions
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement extension activation and command registration
  - Create extension.ts entry point with activate() and deactivate()
  - Register "Open OpenAPI Preview" command
  - Register "Open OpenAPI Preview to Side" command
  - Add editor toolbar button for preview
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement OpenAPI file detection
  - Create file detection logic to identify OpenAPI files
  - Check for .yaml, .yml, .json extensions
  - Check for "openapi:" or "swagger:" markers in file content
  - Enable commands only for detected OpenAPI files
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Create preview manager
  - Implement PreviewManager class to manage webview lifecycle
  - Create method to create or show preview panel
  - Handle preview panel disposal and cleanup
  - Track active preview panel
  - _Requirements: 1.1, 4.3_

- [x] 5. Implement webview content generation
  - Create HTML template for webview
  - Copy web-components.min.js and styles.min.css from @stoplight/elements package
  - Generate HTML that loads Stoplight Elements web component
  - Include <elements-api> custom element in HTML
  - Configure Content Security Policy
  - Add header navigation with layout controls
  - _Requirements: 1.4, 6.1, 6.2_

- [x] 6. Implement file reading and content passing
  - Read OpenAPI file content from disk
  - Pass raw file content to webview
  - Handle file reading errors (not found, permission denied)
  - _Requirements: 1.1, 7.4_

- [x] 7. Implement webview communication
  - Set up message passing from extension to webview
  - Send file content updates to webview
  - Send Stoplight options updates to webview
  - Handle ready and error messages from webview
  - _Requirements: 2.1, 2.2_

- [x] 8. Implement file watcher for live updates
  - Watch active OpenAPI file for changes
  - Trigger preview update when file content changes
  - Handle file deletion events
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 9. Implement column management
  - Open preview in separate editor column
  - Place preview beside active editor
  - Handle single column vs multi-column layouts
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 10. Implement header navigation controls
  - Add layout selector (sidebar/stacked/responsive)
  - Add "Hide Try It" checkbox
  - Add "Hide Schemas" checkbox
  - Wire controls to update Stoplight Elements properties
  - _Requirements: 1.4, 5.1, 5.2, 5.3_

- [x] 11. Add extension configuration
  - Define configuration schema in package.json
  - Add defaultLayout setting
  - Add previewColumn setting
  - Add defaultHideTryIt setting
  - Add defaultHideSchemas setting
  - Read configuration values in extension code
  - _Requirements: 1.4_

- [x] 12. Implement error handling
  - Handle file reading errors gracefully
  - Display error messages in preview panel
  - Ensure extension doesn't crash on invalid content
  - Let Stoplight Elements handle OpenAPI parsing errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Test webview HTML content with Chrome DevTools MCP
  - Verify Stoplight Elements scripts are loaded
  - Verify Stoplight Elements CSS is loaded
  - Verify elements-api component is present in DOM
  - Verify API documentation renders correctly
  - Verify header navigation controls are present
  - Verify layout switching works
  - Verify Try It toggle works
  - Verify Schemas toggle works
  - Verify content updates when file changes
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 6.1, 6.2_

- [x] 14. Write unit tests for core functionality
  - Test file detection logic
  - Test HTML generation structure
  - Test file reading logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
