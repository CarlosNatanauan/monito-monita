import { AbsoluteFill, Composition, Still } from "remotion";
import "./lib/theme";
import { LOOP_DURATION, MonitoLoop } from "./Loop";
import { MonitoDemo } from "./MonitoDemo";
import { LandingPoster } from "./Poster";
import { DURATION, FPS, H, W } from "./lib/time";

const MonitoDemo720: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <AbsoluteFill style={{ width: W, height: H, transformOrigin: "0 0", transform: `scale(${1280 / W})` }}>
      <MonitoDemo />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MonitoDemo" component={MonitoDemo} width={W} height={H} fps={FPS} durationInFrames={DURATION} defaultProps={{ muted: false }} />
    {/* The landing's 720p MP4, rendered from the 1920×1080 layout scaled by 2/3 (--scale gives a non-integer height). */}
    <Composition id="MonitoDemo720" component={MonitoDemo720} width={1280} height={720} fps={FPS} durationInFrames={DURATION} />
    <Still id="LandingPoster" component={LandingPoster} width={W} height={H} />
    <Composition id="MonitoLoop" component={MonitoLoop} width={W} height={H} fps={FPS} durationInFrames={LOOP_DURATION} />
  </>
);
