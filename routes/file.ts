import express from "express";
import fs from "fs";
import path from "path";
import { TEMP_DIR } from "../utils/constants";

const router = express.Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const file = fs
    .readdirSync(TEMP_DIR)
    .find((f) => f.startsWith(id));

  if (!file) {
    return res.status(404).json({
      error: "File not found",
    });
  }

  const filepath = path.join(TEMP_DIR, file);

  res.download(filepath, file, (err) => {
    if (err) {
      console.error(err);
    }
  });
});

export default router;