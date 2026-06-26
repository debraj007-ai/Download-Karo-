import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import fileRouter from "./routes/file";

import downloadRouter from "./routes/download";
import progressRouter from "./routes/progress";
import videoInfoRouter from "./routes/videoInfo";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));
  

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      status: "ok",
      time: new Date().toISOString(),
    });
  });

  // API Routes
  app.use("/api/download", downloadRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/video-info", videoInfoRouter);
  app.use("/api/file", fileRouter);
app.get("/", (req, res) => {

  res.send("Railway Backend Running");

});
  // Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    console.log("✅ Vite middleware loaded");
  } else {
    // Production
    const dist = path.join(process.cwd(), "dist");

    app.use(express.static(dist));

    app.get("*", (req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });

    console.log("✅ Production build loaded");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("==================================");
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("==================================");
  });
}

startServer().catch((err) => {
  console.error(err);
});