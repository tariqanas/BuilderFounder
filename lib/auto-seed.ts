import { createClient } from "@supabase/supabase-js";

type SeedUser = {
  email: string;
  password: string;
  username: string;
  bio: string;
  role: "idea_person" | "builder";
  niches_tags?: string[];
  stack_tags?: string[];
};

type IdeaSeed = {
  title: string;
  niche_problem: string;
  traction: string;
  what_i_bring: string;
  what_i_seek: string;
  tags: string[];
};

const ideaSeeds: IdeaSeed[] = [
  {
    title: "PulseBoard AI",
    niche_problem: "Les équipes SaaS perdent du temps à synthétiser les KPIs hebdo.",
    traction: "180 waitlist",
    what_i_bring: "Vision produit, interviews utilisateurs, roadmap claire.",
    what_i_seek: "Builder pour data pipeline + dashboards.",
    tags: ["AI", "SaaS", "B2B"],
  },
  {
    title: "Leadflow CRM",
    niche_problem: "Les freelances perdent des deals faute de suivi structuré.",
    traction: "2 beta payants",
    what_i_bring: "Go-to-market freelancers, pricing testé.",
    what_i_seek: "Builder web + CRM light.",
    tags: ["B2B", "Productivity"],
  },
  {
    title: "Sprint Rituals",
    niche_problem: "Les équipes remote perdent le rythme des rituels sprint.",
    traction: "9 startups intéressées",
    what_i_bring: "Templates, onboarding, brand.",
    what_i_seek: "Dev pour intégration Notion + Slack.",
    tags: ["Productivity", "B2B"],
  },
  {
    title: "Creator RevOps",
    niche_problem: "Les créateurs gèrent mal les revenus multi-plateformes.",
    traction: "60 créateurs en test",
    what_i_bring: "Partenariats creators, growth.",
    what_i_seek: "Builder pour data aggregation.",
    tags: ["Creator", "Fintech"],
  },
  {
    title: "Async Demo Studio",
    niche_problem: "Difficile de produire des démos personnalisées rapidement.",
    traction: "12 demandes inbound",
    what_i_bring: "Sales ops, scripts.",
    what_i_seek: "Builder video automation.",
    tags: ["SaaS", "AI"],
  },
  {
    title: "Habit Loop",
    niche_problem: "La micro-habitude ne tient pas sans feedback.",
    traction: "Beta 120 utilisateurs",
    what_i_bring: "UX research, contenu.",
    what_i_seek: "Builder mobile + notifications.",
    tags: ["Health", "Productivity"],
  },
  {
    title: "Support Triage",
    niche_problem: "Trop de tickets support non priorisés.",
    traction: "3 équipes pilotes",
    what_i_bring: "Customer success + dataset.",
    what_i_seek: "Builder pour IA classification.",
    tags: ["AI", "B2B"],
  },
  {
    title: "Deal Room Lite",
    niche_problem: "Les founders n'ont pas de lieu simple pour closing.",
    traction: "15 closings test",
    what_i_bring: "Sales playbook.",
    what_i_seek: "Builder full-stack.",
    tags: ["SaaS", "B2B"],
  },
  {
    title: "UX Feedback Loop",
    niche_problem: "Les feedbacks produit restent éparpillés.",
    traction: "20 demandes démo",
    what_i_bring: "Product discovery.",
    what_i_seek: "Builder pour pipeline + dashboards.",
    tags: ["Productivity", "B2B"],
  },
  {
    title: "HR Pulse",
    niche_problem: "Les PME ne mesurent pas l'engagement équipes.",
    traction: "5 RH pilotes",
    what_i_bring: "Distribution réseau RH.",
    what_i_seek: "Builder pour enquêtes + analytics.",
    tags: ["B2B", "Health"],
  },
  {
    title: "Micro Launch OS",
    niche_problem: "Les microSaaS peinent à lancer des campagnes.",
    traction: "40 founders en waitlist",
    what_i_bring: "Growth planning.",
    what_i_seek: "Builder pour automation.",
    tags: ["SaaS", "Marketing"],
  },
  {
    title: "Ops Concierge",
    niche_problem: "Les ops early-stage manquent d'outils proactifs.",
    traction: "7 consultations payantes",
    what_i_bring: "Ops + process.",
    what_i_seek: "Builder pour workflows.",
    tags: ["B2B", "Productivity"],
  },
];

const seedUsers: SeedUser[] = [
  {
    email: "founder.seed@builderfounder.dev",
    password: "BuilderFounder123!",
    username: "NoaFounder",
    bio: "Ex-PM SaaS, focus sur microSaaS B2B utiles.",
    role: "idea_person",
    niches_tags: ["AI", "SaaS", "B2B"],
  },
  {
    email: "builder.seed@builderfounder.dev",
    password: "BuilderFounder123!",
    username: "SamBuilder",
    bio: "Full-stack builder, Next.js + Supabase + PWA.",
    role: "builder",
    stack_tags: ["Next.js", "Supabase", "PWA"],
  },
];

const getAdminClient = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const ensureUser = async (supabase: ReturnType<typeof getAdminClient>, user: SeedUser) => {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", user.username)
    .maybeSingle();

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create seed user");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username: user.username,
    bio: user.bio,
    role: user.role,
    niches_tags: user.niches_tags ?? null,
    stack_tags: user.stack_tags ?? null,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return data.user.id;
};

export const runAutoSeed = async () => {
  const supabase = getAdminClient();
  const { count, error } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) >= 3) {
    return { seeded: false, ideaCount: count ?? 0 };
  }

  const ideaOwnerId = await ensureUser(supabase, seedUsers[0]);
  const builderId = await ensureUser(supabase, seedUsers[1]);

  const { error: ideasError, data: insertedIdeas } = await supabase
    .from("ideas")
    .insert(
      ideaSeeds.map((idea) => ({
        ...idea,
        user_id: ideaOwnerId,
        status: "active",
      })),
    )
    .select("id");

  if (ideasError) {
    throw new Error(ideasError.message);
  }

  const ideaIds = (insertedIdeas ?? []).map((idea) => idea.id);
  const likeIds = ideaIds.slice(0, 4);

  if (likeIds.length > 0) {
    const { error: likesError } = await supabase.from("idea_likes").upsert(
      likeIds.map((ideaId) => ({
        idea_id: ideaId,
        user_id: builderId,
      })),
      { onConflict: "idea_id,user_id" },
    );

    if (likesError) {
      throw new Error(likesError.message);
    }
  }

  const matchIdeaId = ideaIds[0];
  if (matchIdeaId) {
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("idea_id", matchIdeaId)
      .eq("builder_id", builderId)
      .maybeSingle();

    if (!existingMatch) {
      const { error: matchError } = await supabase.from("matches").insert({
        idea_id: matchIdeaId,
        builder_id: builderId,
        status: "accepted",
      });

      if (matchError) {
        throw new Error(matchError.message);
      }
    }
  }

  return {
    seeded: true,
    ideaCount: ideaIds.length,
    users: seedUsers.map((user) => user.email),
  };
};
