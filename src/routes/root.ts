import { Hono } from "hono";
import { handleHealthCheck } from "../handlers/root";
import type { HonoEnv } from "../types";

const rootRouter = new Hono<HonoEnv>();
rootRouter.get("/", handleHealthCheck);

export default rootRouter;
