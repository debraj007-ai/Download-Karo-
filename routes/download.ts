import express from "express";
import { downloadMedia } from "../services/downloader";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      url,
      quality = "720",
      audioOnly = false,
    } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "URL is required",
      });
    }

    const { id } = await downloadMedia({
      url,
      quality,
      audioOnly,
    });

    res.json({
      success: true,
      id,
    });

  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;