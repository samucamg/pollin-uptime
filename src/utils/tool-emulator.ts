import type { ChatMessage, ToolCall, ToolDefinition } from "../types";

export class ToolCallingEmulator {
  /**
   * Converte ferramentas em System Prompt ReAct rígido
   */
  static injectToolsPrompt(
    systemPrompt: string,
    tools: ToolDefinition[],
    toolChoice?: unknown,
  ): string {
    if (!tools || tools.length === 0 || toolChoice === "none") {
      return systemPrompt;
    }

    const toolDescriptions = tools.map((t) => {
      const name = t.function?.name || "unnamed_tool";
      const desc = t.function?.description || "No description";
      const params = t.function?.parameters || {};
      return `- **${name}**: ${desc}\n  Parameters (JSON Schema): ${JSON.stringify(params)}`;
    });

    let forceInstruction = "";
    if (
      typeof toolChoice === "object" &&
      toolChoice !== null &&
      "function" in toolChoice &&
      typeof (toolChoice as { function?: { name?: string } }).function?.name ===
        "string"
    ) {
      const targetName = (toolChoice as { function: { name: string } }).function
        .name;
      forceInstruction = `\nATTENTION: You MUST execute the tool: "${targetName}".`;
    } else if (toolChoice === "required") {
      forceInstruction = `\nATTENTION: You MUST execute at least one of the available tools before answering.`;
    }

    const injection = `
=== TOOL EXECUTION SYSTEM (TOOL CALLING) ===
You have access to the following tools:
${toolDescriptions.join("\n\n")}
${forceInstruction}

STRICT OUTPUT GUIDELINES:
1. If you need to call a tool, answer ONLY with the tool JSON block.
2. NEVER add greetings, apologies or explanations before or after the JSON tool call block.
3. If the tool result is already in the conversation history, answer the user directly in friendly natural language.
4. Format for calling tools:
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_${crypto.randomUUID().slice(0, 8)}",
      "type": "function",
      "function": {
        "name": "TOOL_NAME",
        "arguments": { ... }
      }
    }
  ]
}
\`\`\`
============================================`;

    return systemPrompt ? `${systemPrompt}\n\n${injection}` : injection;
  }

  /**
   * Extrai blocos de tool_calls da resposta em texto do modelo
   */
  static extractToolCalls(content: string): {
    textContent: string | null;
    toolCalls?: ToolCall[];
  } {
    if (!content) return { textContent: null };

    // Tenta encontrar bloco ```json { "tool_calls": [...] } ``` ou JSON solto
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/(\{\s*"tool_calls"\s*:\s*\[[\s\S]*?\]\s*\})/);

    if (jsonMatch) {
      try {
        const rawJson = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0) {
          const validToolCalls: ToolCall[] = parsed.tool_calls.map(
            (tc: any) => ({
              id: tc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
              type: "function",
              function: {
                name: tc.function?.name || tc.name || "unknown",
                arguments:
                  typeof tc.function?.arguments === "object"
                    ? JSON.stringify(tc.function.arguments)
                    : typeof tc.function?.arguments === "string"
                      ? tc.function.arguments
                      : "{}",
              },
            }),
          );

          const remainingText = content.replace(jsonMatch[0], "").trim();
          return {
            textContent: remainingText.length > 0 ? remainingText : null,
            toolCalls: validToolCalls,
          };
        }
      } catch {
        // Se falhar o parse, retorna o texto puro
      }
    }

    return { textContent: content };
  }
}
