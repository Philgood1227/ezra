import { describe, expect, it } from "vitest";
import {
  chooseWinningMovieOption,
  computeNextCinemaRotation,
  getNextRotationMember,
} from "@/lib/domain/cinema-rotation";

describe("cinema rotation domain", () => {
  it("choisit le membre suivant dans la rotation", () => {
    const members = [
      { id: "p1", displayName: "Alice" },
      { id: "p2", displayName: "Ezra" },
      { id: "p3", displayName: "Milo" },
    ];

    expect(getNextRotationMember(members, "p1")?.id).toBe("p2");
    expect(getNextRotationMember(members, "p3")?.id).toBe("p1");
  });

  it("calcule un proposeur et un decideur coherents", () => {
    const rotation = computeNextCinemaRotation({
      members: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Ezra" },
      ],
      lastProposerId: "p1",
      lastPickerId: "p2",
    });

    expect(rotation.proposerProfileId).toBe("p2");
    expect(rotation.pickerProfileId).toBe("p1");
  });

  it("compte les votes et applique un tie-break stable", () => {
    const winner = chooseWinningMovieOption({
      orderedOptionIds: ["o1", "o2", "o3"],
      votes: [
        { movieOptionId: "o2" },
        { movieOptionId: "o2" },
        { movieOptionId: "o1" },
      ],
    });

    expect(winner).toBe("o2");

    const tieWinner = chooseWinningMovieOption({
      orderedOptionIds: ["o1", "o2"],
      votes: [
        { movieOptionId: "o2" },
        { movieOptionId: "o1" },
      ],
    });

    expect(tieWinner).toBe("o1");
  });
});
