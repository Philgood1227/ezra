import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParentAlarmsManager } from "@/features/alarms/components";
import type { AlarmEventWithRule, AlarmRuleSummary } from "@/lib/day-templates/types";

const refresh = vi.fn();
const createAlarmRuleAction = vi.fn();
const updateAlarmRuleAction = vi.fn();
const toggleAlarmRuleEnabledAction = vi.fn();
const deleteAlarmRuleAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/actions/alarms", () => ({
  createAlarmRuleAction: (...args: unknown[]) => createAlarmRuleAction(...args),
  updateAlarmRuleAction: (...args: unknown[]) => updateAlarmRuleAction(...args),
  toggleAlarmRuleEnabledAction: (...args: unknown[]) => toggleAlarmRuleEnabledAction(...args),
  deleteAlarmRuleAction: (...args: unknown[]) => deleteAlarmRuleAction(...args),
}));

const rules: AlarmRuleSummary[] = [
  {
    id: "rule-1",
    familyId: "family-1",
    childProfileId: "child-1",
    label: "Reveil",
    mode: "semaine_travail",
    oneShotAt: null,
    timeOfDay: "07:30:00",
    daysMask: 31,
    soundKey: "cloche_douce",
    message: "C'est l'heure de te lever.",
    enabled: true,
    createdAt: "2026-02-12T08:00:00.000Z",
    updatedAt: "2026-02-12T08:00:00.000Z",
  },
];

const events: AlarmEventWithRule[] = [
  {
    id: "event-1",
    alarmRuleId: "rule-1",
    familyId: "family-1",
    childProfileId: "child-1",
    dueAt: "2026-02-12T06:30:00.000Z",
    triggeredAt: "2026-02-12T06:30:05.000Z",
    acknowledgedAt: null,
    status: "declenchee",
    createdAt: "2026-02-12T06:30:05.000Z",
    ruleLabel: "Reveil",
    ruleMessage: "C'est l'heure de te lever.",
    ruleSoundKey: "cloche_douce",
  },
];

describe("ParentAlarmsManager", () => {
  it("cree une alarme puis permet de la desactiver", async () => {
    createAlarmRuleAction.mockResolvedValue({ success: true, data: { id: "rule-created" } });
    toggleAlarmRuleEnabledAction.mockResolvedValue({ success: true });

    render(<ParentAlarmsManager childName="Ezra" rules={rules} events={events} />);

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Devoirs soir" } });
    fireEvent.change(screen.getByLabelText("Message affiche en grand"), {
      target: { value: "Pause devoirs." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l'alarme" }));

    await waitFor(() => {
      expect(createAlarmRuleAction).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalled();
    });

    const toggleButton = screen.getByRole("button", { name: "Desactiver" });
    await waitFor(() => {
      expect(toggleButton).not.toBeDisabled();
    });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(toggleAlarmRuleEnabledAction).toHaveBeenCalledWith({
        ruleId: "rule-1",
        enabled: false,
      });
    });
  });

  it("demande confirmation avant suppression d'une alarme", async () => {
    deleteAlarmRuleAction.mockResolvedValue({ success: true });

    render(<ParentAlarmsManager childName="Ezra" rules={rules} events={events} />);

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByText("Supprimer cette alarme ?")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer" });
    const confirmDeleteButton = deleteButtons[1];
    if (!confirmDeleteButton) {
      throw new Error("Confirm delete button not found.");
    }

    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(deleteAlarmRuleAction).toHaveBeenCalledWith({ ruleId: "rule-1" });
    });
  });
});
