import { Composition } from "remotion";
import "./lib/theme";
import { LOOP_DURATION, MonitoLoop } from "./Loop";
import { MonitoDemo } from "./MonitoDemo";
import { DURATION, FPS, H, W } from "./lib/time";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MonitoDemo" component={MonitoDemo} width={W} height={H} fps={FPS} durationInFrames={DURATION} defaultProps={{ muted: false }} />
    <Composition id="MonitoLoop" component={MonitoLoop} width={W} height={H} fps={FPS} durationInFrames={LOOP_DURATION} />
  </>
);
