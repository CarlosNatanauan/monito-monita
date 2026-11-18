// Remotion CLI config (studio and render). See https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p");
// The recordings are 4K and 3x phone captures: give OffthreadVideo room.
Config.setOffthreadVideoCacheSizeInBytes(2 * 1024 * 1024 * 1024);
