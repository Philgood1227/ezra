import type { EmotionValue } from "@/lib/day-templates/types";

export const EMOTION_SCORE: Record<EmotionValue, number> = {
  tres_content: 2,
  content: 1,
  neutre: 0,
  triste: -1,
  tres_triste: -2,
};

export const EMOTION_LABEL: Record<EmotionValue, string> = {
  tres_content: "Tres content",
  content: "Content",
  neutre: "Comme d'habitude",
  triste: "Triste",
  tres_triste: "Tres triste",
};

export const EMOTION_EMOJI: Record<EmotionValue, string> = {
  tres_content: "😁",
  content: "🙂",
  neutre: "😐",
  triste: "🙁",
  tres_triste: "😢",
};

export function getEmotionScore(emotion: EmotionValue): number {
  return EMOTION_SCORE[emotion];
}

export function getEmotionLabel(emotion: EmotionValue): string {
  return EMOTION_LABEL[emotion];
}

export function getEmotionEmoji(emotion: EmotionValue): string {
  return EMOTION_EMOJI[emotion];
}

export function getDominantEmotion(emotions: EmotionValue[]): EmotionValue | null {
  if (emotions.length === 0) {
    return null;
  }

  const scoreByEmotion = new Map<EmotionValue, number>();
  emotions.forEach((emotion) => {
    scoreByEmotion.set(emotion, (scoreByEmotion.get(emotion) ?? 0) + 1);
  });

  let winner: EmotionValue | null = null;
  let bestCount = -1;
  let bestScore = -Infinity;

  scoreByEmotion.forEach((count, emotion) => {
    const score = getEmotionScore(emotion);
    if (count > bestCount || (count === bestCount && score > bestScore)) {
      winner = emotion;
      bestCount = count;
      bestScore = score;
    }
  });

  return winner;
}

export function getMoodSummaryMessage(averageScore: number | null): string {
  if (averageScore === null) {
    return "Pas encore de meteo interieure cette semaine.";
  }

  if (averageScore >= 1) {
    return "Semaine plutot ensoleillee 🙂";
  }

  if (averageScore >= 0) {
    return "Semaine plutot equilibree 🙂";
  }

  if (averageScore >= -0.5) {
    return "Quelques nuages, on ajuste le rythme.";
  }

  return "Beaucoup de nuages, on en parle ?";
}
