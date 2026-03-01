type MissionEmailInput = {
  score: number;
  title: string;
  country?: string | null;
  remote?: string | null;
  dayRate?: number | null;
  url: string;
  reasons: string[];
  pitch: string;
};

function cleanReasons(reasons: string[]) {
  return reasons.map((reason) => reason.trim()).filter(Boolean).slice(0, 3);
}

export function buildMissionEmail(input: MissionEmailInput) {
  const reasons = cleanReasons(input.reasons);
  const subject = `Mission match ${input.score}% — ${input.title}`;
  const lines = [
    "New mission signal for your radar.",
    "",
    `Mission: ${input.title}`,
    `Location: ${input.country ?? "N/A"}`,
    `Mode: ${input.remote ?? "N/A"}`,
    `Day rate: ${input.dayRate ? `${input.dayRate}€` : "N/A"}`,
    `Link: ${input.url}`,
    "",
    "Why you:",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "Pitch ready:",
    input.pitch,
    "",
    "IT Sniper is a decision tool. No guarantee of outcomes.",
  ];

  return { subject, body: lines.join("\n") };
}
