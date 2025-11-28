// src/services/autocomplete.ts
const API_BASE = process.env.REACT_APP_API_BASE!

export interface AutocompleteRequest {
  code: string;
  cursorPosition: number;
  language: string;
}

export interface AutocompleteResponse {
  suggestion: string;
  replaceRange: any | null;
}

export async function getAutocompleteSuggestion(
  code: string,
  cursorPosition: number,
  language: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        cursorPosition,
        language,
      } as AutocompleteRequest),
    });

    if (!response.ok) {
      console.error("Autocomplete request failed:", response.statusText);
      return "";
    }

    const data: AutocompleteResponse = await response.json();
    return data.suggestion || "";
  } catch (error) {
    console.error("Autocomplete error:", error);
    return "";
  }
}
