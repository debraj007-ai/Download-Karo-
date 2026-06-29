import { execa } from "execa";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { TEMP_DIR } from "../utils/constants";
import { downloadProgress } from "../utils/progress";

export interface DownloadOptions {
  url: string;
  quality: string;
  audioOnly: boolean;
}

export async function downloadMedia({
  url,
  quality,
  audioOnly,
}: DownloadOptions) {
  // Create temp folder if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const id = uuidv4();
  downloadProgress.set(id, {
  progress: 0,
  status: "Starting download..."
});

const outputTemplate = path.join(
  TEMP_DIR,
  audioOnly ? `${id}.mp3` : `${id}.mp4`
);
const args = [
  url,
  "-o",
  outputTemplate,
  "--newline",
  "--cookies",
  path.join(process.cwd(), "cookies.txt"),
];

if (audioOnly) {
  args.push(
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0"
  );
} else {
 args.push(
  "-f",
  `bv*[height<=${quality}]+ba/b`,
  "--merge-output-format",
  "mp4",
  "--recode-video",
  "mp4"
);
}

if (ffmpegPath) {
  args.push(
    "--ffmpeg-location",
    ffmpegPath
  );
}

const subprocess = execa("yt-dlp", args);

subprocess.stdout?.on("data", (data) => {
  const line = data.toString();

  const match = line.match(/(\d+(?:\.\d+)?)%/);

  if (match) {
    downloadProgress.set(id, {
      progress: Number(match[1]),
      status: line,
    });
  }
});

subprocess.stdout?.pipe(process.stdout);
subprocess.stderr?.pipe(process.stderr);

try {
  await subprocess;

  const filePath = outputTemplate;

  if (!fs.existsSync(filePath)) {
    throw new Error("Download failed. File not found.");
  }

  downloadProgress.set(id, {
    progress: 100,
    status: "Completed",
  });

  return {
    id,
    filePath,
  };
} catch (err) {
  downloadProgress.set(id, {
    progress: 0,
    status: "Failed",
  });

  console.error(err);
  throw err;
}
}