import express from "express";
import { downloadProgress } from "../utils/progress";

const router = express.Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const progress = downloadProgress.get(id);

  if (!progress) {
    return res.status(404).json({
      error: "Download not found",
    });
  }

  res.json(progress);
});

export default router;