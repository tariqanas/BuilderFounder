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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users: SeedUser[] = [
  {
    email: "founder@builderfounder.dev",
    password: "BuilderFounder123!",
    username: "LunaFounder",
    bio: "Ex-Product @ SaaS, obsédée par les microSaaS AI utiles.",
    role: "idea_person",
    niches_tags: ["AI", "Productivity", "B2B"],
  },
  {
    email: "builder@builderfounder.dev",
    password: "BuilderFounder123!",
    username: "TheoBuilder",
    bio: "Full-stack builder, React + Supabase + GPT lover.",
    role: "builder",
    stack_tags: ["Next.js", "Supabase", "AI"],
  },
  {
    email: "growth@builderfounder.dev",
    password: "BuilderFounder123!",
    username: "MayaGrowth",
    bio: "Growth & ops, aime valider vite les idées.",
    role: "idea_person",
    niches_tags: ["Creator", "Fintech"],
  },
];

const ideaSeeds = [
  {
    title: "AI Inbox Triage",
    niche_problem: "Trop d'emails clients à prioriser chaque jour.",
    traction: "120 waitlist",
    what_i_bring: "Vision produit, interviews, roadmap claire.",
    what_i_seek: "Builder pour MVP + intégrations Gmail.",
    tags: ["AI", "Productivity", "microSaaS"],
  },
  {
    title: "Notion Sprint Coach",
    niche_problem: "Les équipes perdent le rythme des sprints en remote.",
    traction: "35 équipes test",
    what_i_bring: "Design système et contenu onboarding.",
    what_i_seek: "Dev pour intégration Notion + calendrier.",
    tags: ["Productivity", "B2B"],
  },
  {
    title: "Founder Pulse",
    niche_problem: "Difficile de suivre les KPIs clés chaque matin.",
    traction: "5k€/mois MRR potentiel validé",
    what_i_bring: "Ops, dashboard KPIs, contacts early adopters.",
    what_i_seek: "Builder data + alerting Slack.",
    tags: ["SaaS", "B2B"],
  },
  {
    title: "Creator Dealroom",
    niche_problem: "Les créateurs perdent des deals faute d'outils de suivi.",
    traction: "18 créateurs actifs",
    what_i_bring: "Partenariats brands, templates commerciaux.",
    what_i_seek: "Builder web + CRM light.",
    tags: ["Creator", "SaaS"],
  },
  {
    title: "Micro Habit Buddy",
    niche_problem: "Difficile de tenir de micro-habitudes au quotidien.",
    traction: "Beta 80 utilisateurs",
    what_i_bring: "UX, contenu, insights comportement.",
    what_i_seek: "Builder mobile + notifications.",
    tags: ["Health", "Productivity"],
  },
  {
    title: "Freelance Scope Guard",
    niche_problem: "Scope creep sur les missions freelance.",
    traction: "50 devis générés",
    what_i_bring: "Go-to-market freelances, pricing.",
    what_i_seek: "Builder web + templates IA.",
    tags: ["B2B", "AI"],
  },
  {
    title: "AI Persona Analyzer",
    niche_problem: "Les personas marketing sont trop génériques.",
    traction: "2 agences pilotes",
    what_i_bring: "Expertise marketing, acquisition testée.",
    what_i_seek: "Builder pour parser data + insights.",
    tags: ["AI", "Marketing"],
  },
  {
    title: "Feedback Loop Studio",
    niche_problem: "Les équipes n'exploitent pas les feedbacks clients.",
    traction: "9 startups intéressées",
    what_i_bring: "Recherche utilisateur, roadmap.",
    what_i_seek: "Builder pour pipeline feedback + dashboards.",
    tags: ["B2B", "Productivity"],
  },
  {
    title: "Async Demo Generator",
    niche_problem: "Difficulté à produire des démos personnalisées.",
    traction: "10 startups inbound",
    what_i_bring: "Sales, scripts, besoins clairs.",
    what_i_seek: "Builder video + automation.",
    tags: ["SaaS", "AI"],
  },
  {
    title: "DevRel Journal",
    niche_problem: "Les DevRel perdent le suivi des community touchpoints.",
    traction: "12 leads SaaS",
    what_i_bring: "Réseau DevRel, backlog features.",
    what_i_seek: "Builder pour app mobile légère.",
    tags: ["Community", "SaaS"],
  },
];

const ensureUser = async (user: SeedUser) => {
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
    throw new Error(error?.message ?? "Failed to create user");
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

const seedIdeas = async (userId: string) => {
  const { data: existingIdeas, error } = await supabase
    .from("ideas")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if ((existingIdeas ?? []).length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("ideas").insert(
    ideaSeeds.map((idea) => ({
      ...idea,
      user_id: userId,
      status: "active",
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
};

const seedLikes = async (builderId: string, ideaOwnerId: string) => {
  const { data: ideas, error } = await supabase
    .from("ideas")
    .select("id")
    .eq("user_id", ideaOwnerId)
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  if (!ideas?.length) return;

  const { error: likeError } = await supabase
    .from("idea_likes")
    .upsert(
      ideas.map((idea) => ({ idea_id: idea.id, user_id: builderId })),
      { onConflict: "idea_id,user_id" },
    );

  if (likeError) {
    throw new Error(likeError.message);
  }
};

const seedMatches = async (builderId: string, ideaOwnerId: string) => {
  const { data: ideas, error } = await supabase
    .from("ideas")
    .select("id")
    .eq("user_id", ideaOwnerId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const idea = ideas?.[0];
  if (!idea) return;

  const { data: existing, error: matchLookupError } = await supabase
    .from("matches")
    .select("id")
    .eq("idea_id", idea.id)
    .eq("builder_id", builderId)
    .maybeSingle();

  if (matchLookupError) {
    throw new Error(matchLookupError.message);
  }

  if (!existing) {
    const { error: matchError } = await supabase
      .from("matches")
      .insert({ idea_id: idea.id, builder_id: builderId, status: "accepted" });

    if (matchError) {
      throw new Error(matchError.message);
    }
  }
};

const run = async () => {
  console.log("🌱 Seeding BuilderFounder data...");
  const [ideaPerson, builder, growth] = users;

  const ideaPersonId = await ensureUser(ideaPerson);
  const builderId = await ensureUser(builder);
  const growthId = await ensureUser(growth);

  await seedIdeas(ideaPersonId);
  await seedIdeas(growthId);
  await seedLikes(builderId, ideaPersonId);
  await seedMatches(builderId, ideaPersonId);

  console.log("✅ Seed terminé.");
};

run().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
