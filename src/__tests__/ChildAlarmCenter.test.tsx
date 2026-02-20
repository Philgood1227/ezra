import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChildAlarmCenter } from "@/features/alarms/components";

const pollDueAlarmEventsAction = vi.fn();
const acknowledgeAlarmEventAction = vi.fn();

vi.mock("@/lib/actions/alarms", () => ({
  pollDueAlarmEventsAction: (...args: unknown[]) => pollDueAlarmEventsAction(...args),
  acknowledgeAlarmEventAction: (...args: unknown[]) => acknowledgeAlarmEventAction(...args),
}));

describe("ChildAlarmCenter", () => {
  it("affiche l'alarme active et permet l'acquittement", async () => {
    pollDueAlarmEventsAction.mockResolvedValue({
      success: true,
      data: {
        events: [
          {
            id: "event-1",
            alarmRuleId: "rule-1",
            familyId: "family-1",
            childProfileId: "child-1",
            dueAt: "2026-02-12T07:30:00.000Z",
            triggeredAt: "2026-02-12T07:30:01.000Z",
            acknowledgedAt: null,
            status: "declenchee",
            createdAt: "2026-02-12T07:30:01.000Z",
            ruleLabel: "Reveil",
            ruleMessage: "C'est l'heure de te preparer.",
            ruleSoundKey: "cloche_douce",
          },
        ],
      },
    });
    acknowledgeAlarmEventAction.mockResolvedValue({ success: true });

    render(<ChildAlarmCenter />);

    await waitFor(() => {
      expect(screen.getByText("C'est l'heure de te preparer.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));

    await waitFor(() => {
      expect(acknowledgeAlarmEventAction).toHaveBeenCalledWith({ eventId: "event-1" });
    });
  });
});
