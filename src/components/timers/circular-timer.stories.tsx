import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ds";
import { CircularTimer } from "@/components/timers/circular-timer";

interface CircularTimerStoryDemoProps {
  durationSeconds: number;
}

function CircularTimerStoryDemo({ durationSeconds }: CircularTimerStoryDemoProps): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  return (
    <div className="space-y-4">
      <CircularTimer
        durationSeconds={durationSeconds}
        isRunning={isRunning}
        onFinished={() => setIsRunning(false)}
        resetKey={`${durationSeconds}-${resetVersion}`}
      />
      <div className="flex justify-center gap-2">
        <Button variant={isRunning ? "secondary" : "primary"} onClick={() => setIsRunning((current) => !current)}>
          {isRunning ? "Pause" : "Demarrer"}
        </Button>
        <Button
          variant="tertiary"
          onClick={() => {
            setIsRunning(false);
            setResetVersion((value) => value + 1);
          }}
        >
          Reinitialiser
        </Button>
      </div>
    </div>
  );
}

const meta = {
  title: "Timers/CircularTimer",
  component: CircularTimerStoryDemo,
  args: {
    durationSeconds: 600,
  },
} satisfies Meta<typeof CircularTimerStoryDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DixMinutes: Story = {};

export const CinqMinutes: Story = {
  args: {
    durationSeconds: 300,
  },
};
