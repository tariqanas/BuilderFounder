export type UserRole = "idea" | "builder";

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
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  tags?: string[];
}
