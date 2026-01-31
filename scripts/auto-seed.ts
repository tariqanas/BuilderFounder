import { runAutoSeed } from "../lib/auto-seed";

const run = async () => {
  console.log("🌱 Auto-seed BuilderFounder...");
  const result = await runAutoSeed();

  if (result.seeded) {
    console.log("✅ Seed terminé.", result);
  } else {
    console.log("ℹ️ Seed ignoré (déjà assez de données).", result);
  }
};

run().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
