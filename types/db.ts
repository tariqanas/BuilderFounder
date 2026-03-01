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
  reasons: string;
  pitch: string;
  created_at: string;
};
