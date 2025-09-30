/**
 * Manual test script to verify SearchInput ChatGPT-style implementation
 * This file can be used to test the key requirements manually
 */

import React from "react";
import { SearchInput } from "./src/components/search/SearchInput";

export const TestCases = () => {
  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">SearchInput Implementation Test</h1>

      {/* Test Case 1: Default variant with textarea */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Default Variant (ChatGPT-style)
        </h2>
        <SearchInput placeholder="Search for books (default variant)..." />
        <p className="text-sm text-gray-600 mt-2">
          ✓ Should use TextareaAutosize
          <br />
          ✓ Enter submits, Shift+Enter adds newline
          <br />
          ✓ Auto-grows from 3 to 12 rows
          <br />
          ✓ Buttons below textarea in same container
          <br />
        </p>
      </div>

      {/* Test Case 2: Compact variant with input */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Compact Variant (Original style)
        </h2>
        <SearchInput
          variant="compact"
          placeholder="Search for books (compact variant)..."
        />
        <p className="text-sm text-gray-600 mt-2">
          ✓ Should use single-line Input
          <br />
          ✓ Enter submits (no Shift+Enter behavior)
          <br />
          ✓ Horizontal layout preserved
          <br />
          ✓ No keyboard hint shown
          <br />
        </p>
      </div>

      {/* Test Case 3: Keyboard behavior verification */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Keyboard Test Instructions
        </h2>
        <div className="bg-gray-100 p-4 rounded">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Ctrl/Cmd+K:</strong> Should focus the active input
            </li>
            <li>
              <strong>Default variant Enter:</strong> Should submit (prevent
              newline)
            </li>
            <li>
              <strong>Default variant Shift+Enter:</strong> Should add newline
            </li>
            <li>
              <strong>Compact variant Enter:</strong> Should submit
            </li>
            <li>
              <strong>Escape:</strong> Clear input if has content, blur if empty
            </li>
          </ul>
        </div>
      </div>

      {/* Test Case 4: Validation and submission */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Validation Test</h2>
        <SearchInput
          defaultValue=""
          onSearch={(query) => {
            alert(`Search submitted: "${query}"`);
          }}
          placeholder="Type something and press Enter..."
        />
        <p className="text-sm text-gray-600 mt-2">
          ✓ Empty input should not submit
          <br />
          ✓ Valid input should trigger onSearch callback
          <br />
          ✓ Validation errors should show below input
          <br />
        </p>
      </div>
    </div>
  );
};

// Key Requirements Checklist:
// ✓ Default variant uses TextareaAutosize (react-textarea-autosize)
// ✓ Compact variant keeps original single-line Input
// ✓ Action buttons rendered inside same container, below textarea
// ✓ Enter submits in default, Shift+Enter adds newline
// ✓ Compact variant: Enter submits (no Shift+Enter)
// ✓ Keep validation, debouncing, Ctrl+K focus
// ✓ Preserve URL params and navigation
// ✓ Maintain accessibility (aria labels, etc.)
// ✓ All button states and tooltips preserved
// ✓ Error states working with border/ring styling
