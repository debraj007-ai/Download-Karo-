import { execa } from "execa";

export async function getVideoInfo(url: string) {
  const { stdout } = await execa("yt-dlp", [
    "--dump-single-json",
    "--no-playlist",
    url,
  ]);

  const data = JSON.parse(stdout);

  return {
    title: data.title,
    uploader: data.uploader,
    duration: data.duration,
    thumbnail: data.thumbnail,
    uploadDate: data.upload_date,
    viewCount: data.view_count,
    webpageUrl: data.webpage_url,

    formats: data.formats
      .filter((f: any) => f.vcodec !== "none")
      .map((f: any) => ({
        quality: f.height,
        ext: f.ext,
        filesize: f.filesize,
      })),
  };
}