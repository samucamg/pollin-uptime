import { Hono } from "hono";
import { handleGetImageByPrompt } from "../handlers/images";
import { handleListModels } from "../handlers/models";
import { handleGetTextByPrompt, handlePostText } from "../handlers/text";
import type { HonoEnv } from "../types";

const directRouter = new Hono<HonoEnv>();

directRouter.get("/image/:prompt", handleGetImageByPrompt);
directRouter.get("/text/:prompt", handleGetTextByPrompt);
directRouter.post("/text", handlePostText);
directRouter.get("/models", handleListModels);

export default directRouter;
