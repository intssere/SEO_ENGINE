import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadAuthConfig } from "./lib/auth-foundation.js";
import { attachAuthSession, securityHeaders } from "./middlewares/auth-security.js";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const config = loadAuthConfig();
      if (!origin || !config.enabled) return callback(null, true);
      return callback(null, origin === config.publicOrigin);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachAuthSession);

app.use("/api", router);

export default app;
