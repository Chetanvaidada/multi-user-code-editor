const PISTON_ENDPOINT = "https://emkc.org/api/v2/piston/execute";

export interface PistonRunResult {
  run?: {
    stdout?: string;
    stderr?: string;
    code?: number;
    signal?: string | null;
    output?: string;
  };
  compile?: {
    stdout?: string;
    stderr?: string;
    code?: number;
    output?: string;
  };
}

export async function runCodeWithPiston(language: string, code: string, stdin?: string) {
  const payload = {
    language,
    version: "*",
    stdin: stdin ?? "",
    files: [
      {
        name: "Main",
        content: code,
      },
    ],
  };

  const response = await fetch(PISTON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Piston request failed with status ${response.status}`);
  }

  const data = (await response.json()) as PistonRunResult;
  return data;
}

