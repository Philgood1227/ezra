export interface CinemaRotationMember {
  id: string;
  displayName: string;
}

function normalizeMembers(members: CinemaRotationMember[]): CinemaRotationMember[] {
  return [...members].sort((left, right) => {
    const byName = left.displayName.localeCompare(right.displayName, "fr");
    if (byName !== 0) {
      return byName;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getNextRotationMember(
  members: CinemaRotationMember[],
  lastMemberId: string | null,
): CinemaRotationMember | null {
  const ordered = normalizeMembers(members);
  if (ordered.length === 0) {
    return null;
  }

  if (!lastMemberId) {
    return ordered[0] ?? null;
  }

  const lastIndex = ordered.findIndex((member) => member.id === lastMemberId);
  if (lastIndex < 0) {
    return ordered[0] ?? null;
  }

  return ordered[(lastIndex + 1) % ordered.length] ?? null;
}

export function computeNextCinemaRotation(input: {
  members: CinemaRotationMember[];
  lastProposerId: string | null;
  lastPickerId: string | null;
}): { proposerProfileId: string | null; pickerProfileId: string | null } {
  const ordered = normalizeMembers(input.members);
  if (ordered.length === 0) {
    return { proposerProfileId: null, pickerProfileId: null };
  }

  const proposer = getNextRotationMember(ordered, input.lastProposerId);
  if (!proposer) {
    return { proposerProfileId: null, pickerProfileId: null };
  }

  if (ordered.length === 1) {
    return {
      proposerProfileId: proposer.id,
      pickerProfileId: proposer.id,
    };
  }

  const pickerSeed = input.lastPickerId && input.lastPickerId !== proposer.id ? input.lastPickerId : proposer.id;
  const picker = getNextRotationMember(ordered, pickerSeed);

  return {
    proposerProfileId: proposer.id,
    pickerProfileId: picker?.id ?? proposer.id,
  };
}

export function chooseWinningMovieOption(input: {
  orderedOptionIds: string[];
  votes: Array<{ movieOptionId: string }>;
}): string | null {
  if (input.orderedOptionIds.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  input.votes.forEach((vote) => {
    counts.set(vote.movieOptionId, (counts.get(vote.movieOptionId) ?? 0) + 1);
  });

  let bestOptionId = input.orderedOptionIds[0] ?? null;
  let bestCount = bestOptionId ? counts.get(bestOptionId) ?? 0 : -1;

  input.orderedOptionIds.forEach((optionId) => {
    const count = counts.get(optionId) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestOptionId = optionId;
    }
  });

  return bestOptionId;
}
