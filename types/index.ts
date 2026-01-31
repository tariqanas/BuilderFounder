export type UserRole = "idea_person" | "builder";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  username: string;
  bio?: string | null;
  createdAt: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  niche_problem: string;
  traction: string | null;
  what_i_bring: string;
  what_i_seek: string;
  tags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaFormData {
  title: string;
  niche_problem: string;
  traction: string;
  what_i_bring: string;
  what_i_seek: string;
  tags: string[];
}

export interface IdeaWithProfile extends Idea {
  profiles: {
    username: string | null;
    bio: string | null;
  } | null;
}

export interface IdeaLike {
  id: string;
  idea_id: string;
  user_id: string;
  created_at: string;
}
