import React, { useRef } from "react";
import Editor from "@monaco-editor/react";
import { getAutocompleteSuggestion } from "../services/autocomplete";

interface LanguageOption {
  value: string;
  label: string;
}

interface CodeWorkspaceProps {
  code: string;
  language: string;
  languageOptions: LanguageOption[];
  onLanguageChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  runError: string | null;
  runOutput: string;
  editorTheme: string;
}

const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
  code,
  language,
  languageOptions,
  onLanguageChange,
  onCodeChange,
  onRun,
  isRunning,
  runError,
  runOutput,
  editorTheme,
}) => {
  const autocompleteTimerRef = useRef<number | null>(null);
  const lastSuggestionRef = useRef<string>("");

  function handleEditorDidMount(editor: any, monaco: any) {
    // Register inline completions provider for Python
    const provider = monaco.languages.registerInlineCompletionsProvider("python", {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        try {
          const code = model.getValue();
          const offset = model.getOffsetAt(position);

          // Call autocomplete API
          const suggestion = await getAutocompleteSuggestion(code, offset, "python");

          // Store last suggestion
          lastSuggestionRef.current = suggestion;

          if (!suggestion) {
            return { items: [] };
          }

          // Return inline completion item
          return {
            items: [
              {
                insertText: suggestion,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              },
            ],
          };
        } catch (error) {
          console.error("Autocomplete provider error:", error);
          return { items: [] };
        }
      },
    });

    // Trigger inline completions manually after debounce
    const triggerAutocomplete = () => {
      if (autocompleteTimerRef.current) {
        window.clearTimeout(autocompleteTimerRef.current);
      }

      autocompleteTimerRef.current = window.setTimeout(() => {
        // Trigger inline completions
        editor.getAction("editor.action.inlineSuggest.trigger")?.run();
      }, 600); // 600ms debounce as per spec
    };

    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      triggerAutocomplete();
    });

    // Cleanup on unmount
    return () => {
      provider.dispose();
      if (autocompleteTimerRef.current) {
        window.clearTimeout(autocompleteTimerRef.current);
      }
    };
  }

  return (
    <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 420 }}>
      <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 12 }}>
          <label style={{ fontWeight: 600 }}>
            Language{" "}
            <select value={language} onChange={(e) => onLanguageChange(e.target.value)} style={{ marginLeft: 6 }}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={onRun} disabled={isRunning} style={{ padding: "6px 12px" }}>
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
        <div style={{ flex: 1, border: "1px solid #ddd" }}>
          <Editor
            language={language}
            theme={editorTheme}
            value={code}
            onChange={(value) => onCodeChange(value ?? "")}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              inlineSuggest: {
                enabled: true,
              },
              quickSuggestions: false, // Disable default suggestions
            }}
            height="100%"
          />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Output</h4>
          {runError && <span style={{ color: "red", fontSize: 12 }}>{runError}</span>}
        </div>
        <div
          style={{
            border: "1px solid #ddd",
            background: "#f9f9f9",
            flex: 1,
            padding: 12,
            overflowY: "auto",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {runOutput || "Run the current code to see output here."}
        </div>
      </div>
    </div>
  );
};

export default CodeWorkspace;
