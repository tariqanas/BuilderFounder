export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "unpaid"
  | "paused";

export type Mission = {
  id: string;
  user_id: string;
  source: string;
  title: string;
  company: string;
  country: string;
  remote: string;
  day_rate: number | null;
  url: string;
  score: number;
  decision: "KEEP" | "DROP" | null;
  reasons: string;
  pitch: string;
  created_at: string;
};


export type MissionMatch = {
  id: string;
  user_id: string;
  mission_id: string;
  score: number;
  reasons: string;
  created_at: string;
  updated_at: string;
};
