import assert from "node:assert/strict";
import test from "node:test";
import type { EnvBindings } from "../types";
import { getModelRegistry } from "./model-registry";

test("catalog aliases retain model type and capabilities without changing IDs", async (t) => {
  const catalog = [
    { name: "black-forest-labs/flux-1-schnell", aliases: ["flux"] },
    { name: "openai/gpt-5.4-nano", aliases: ["openai-fast"] },
    { name: "google/gemini-2.5-flash-lite:search", aliases: ["gemini-search"] },
    { name: "custom/new-model", aliases: [] },
  ];
  t.mock.method(globalThis, "fetch", async () => Response.json(catalog));
  const { data } = await getModelRegistry({} as EnvBindings);
  assert.deepEqual(
    data.map((model) => model.id),
    catalog.map((model) => model.name),
  );
  assert.equal(data[0].type, "image");
  assert.equal(data[1].supports_tools, true);
  assert.equal(data[2].supports_search, true);
  assert.equal(data[3].type, "chat");
});
