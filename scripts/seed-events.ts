import { createEvent, listEvents } from "../src/lib/repo";
import {
  ELECTION_CATEGORIES,
  ELECTION_CODED_LANGUAGE,
  ELECTION_REPORTING_ROUTES,
  ELECTION_TSET_MAP,
  XENO_CATEGORIES,
  XENO_CODED_LANGUAGE,
  DEFAULT_PLATFORMS,
  DEFAULT_CONTENT_TYPES
} from "../src/lib/framework";

export async function seedEvents(): Promise<void> {
  const slugs = new Set((await listEvents()).map((event) => event.slug));

  if (!slugs.has("elections-2026-11-04")) {
    await createEvent({
      name: "Local Government Elections — 4 November 2026",
      slug: "elections-2026-11-04",
      description:
        "Heightened monitoring across X, TikTok, Facebook, YouTube and WhatsApp before, during and after the 4 November 2026 local-government elections, surfacing electoral mis/disinformation, hate speech and incitement to violence — with attention to voter-suppression disinformation, intimidation and 'no-go area' threats, and coded/evasive language.",
      active: true,
      startDate: "2026-10-20",
      endDate: "2026-11-07",
      categories: ELECTION_CATEGORIES,
      platforms: DEFAULT_PLATFORMS,
      contentTypes: DEFAULT_CONTENT_TYPES,
      codedLanguage: ELECTION_CODED_LANGUAGE,
      reportingRoutes: ELECTION_REPORTING_ROUTES,
      tsetCategoryMap: ELECTION_TSET_MAP
    });
    console.log("✓ Active event created: Local Government Elections — 4 November 2026");
  } else {
    console.log("• Elections event already exists — skipped");
  }

  if (!slugs.has("shutdown-2026-06-30")) {
    await createEvent({
      name: "National Shutdown — 30 June 2026 (archived)",
      slug: "shutdown-2026-06-30",
      description:
        "Archived template: the original xenophobia monitoring window for the 30 June 2026 national shutdown. Kept for reference and reuse.",
      active: false,
      startDate: "2026-06-23",
      endDate: "2026-07-02",
      categories: XENO_CATEGORIES,
      platforms: DEFAULT_PLATFORMS,
      contentTypes: DEFAULT_CONTENT_TYPES,
      codedLanguage: XENO_CODED_LANGUAGE,
      reportingRoutes: ELECTION_REPORTING_ROUTES,
      tsetCategoryMap: ELECTION_TSET_MAP
    });
    console.log("✓ Archived event created: National Shutdown — 30 June 2026");
  } else {
    console.log("• Shutdown event already exists — skipped");
  }
}
