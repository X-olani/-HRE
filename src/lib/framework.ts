// The configurable monitoring "engine": default category definitions, coded
// language, reporting routes and the TSET export mapping. Everything here is
// seeded into an Event row and can be edited per event in the Admin screen, so
// the same framework reconfigures from xenophobia (30 June) to the
// 4 November local-government elections without code changes.

import type { CategoryDef, CodedGroup, ReportingRoute, Entry } from "./types";

// ---- 4 November 2026 Local Government Elections (ACTIVE) --------------------

export const ELECTION_CATEGORIES: CategoryDef[] = [
  {
    key: "mis_disinfo",
    label: "Mis/disinformation",
    color: "#3299CC",
    definition:
      "False or misleading claims about the elections — voting procedures, dates, the IEC, ballots, results, candidates or parties, or about foreign nationals — presented as fact. Includes fabricated 'results', manipulated media, fake official notices and voter-suppression claims (wrong dates/venues, false 'your vote won't count')."
  },
  {
    key: "hate_speech",
    label: "Hate speech",
    color: "#D7D733",
    definition:
      "Content that dehumanises, degrades or calls for discrimination against a group on the basis of nationality, ethnicity, race or political affiliation — including collective blame and dehumanising comparisons directed at migrants or at supporters of a party or community."
  },
  {
    key: "incitement",
    label: "Incitement to violence",
    color: "#A32D2D",
    definition:
      "Content that explicitly or implicitly calls for, encourages, glorifies or coordinates violence, intimidation or property destruction targeting voters, candidates, party members, IEC officials, foreign nationals, their businesses or communities — including 'no-go area' threats and mobilisation tied to election days."
  }
];

export const ELECTION_CODED_LANGUAGE: CodedGroup[] = [
  {
    group: "Electoral disinformation cues",
    terms: [
      "rigged / vote rigging / stolen election",
      "ballot stuffing / pre-marked ballots",
      "IEC captured / IEC fraud / IEC is lying",
      "your vote won't count / spoiled vote claims",
      "fake 'official results' before announcement",
      "wrong voting date / wrong venue (suppression)",
      "'don't bother voting' targeted at an area/group"
    ]
  },
  {
    group: "Intimidation & 'no-go' language",
    terms: [
      "no-go area / 'they can't campaign here'",
      "'we'll shut down the voting station'",
      "'if party X wins...' + implied threat",
      "amabutho / regiment language + mobilisation",
      "'defend our ward' + targeting language",
      "'we know who voted for...'"
    ]
  },
  {
    group: "Xenophobic derogatory terms",
    terms: [
      "makwerekwere / kwerekwere",
      "izinyoka (snakes); amagundane (rats); imihambima (vagrants)",
      "'Zimbos', 'Mozis' in hostile context",
      "foreigners blamed collectively for crime/jobs"
    ]
  },
  {
    group: "Coded action language",
    terms: [
      "'clean up' / 'hlanza' (cleanse)",
      "'reclaim our streets' / 'take back'",
      "'community enforcement' / 'community policing' + targeting",
      "'we know where they are' / 'help us identify' (doxxing)"
    ]
  },
  {
    group: "Emojis & evasion",
    terms: [
      "🧹 (sweep out); 🔥 in targeting context; 🪖 mobilisation",
      "deliberate misspellings: kw*rekwere, m.a.k.w.e.r.e",
      "images of text / screenshots to dodge detection",
      "voice notes describing intended action",
      "'hypothetical' framing: 'IF they don't leave…'",
      "coded hashtags: #OperationClean, #ReclaimSA, election-day variants"
    ]
  }
];

// ---- 30 June 2026 National Shutdown (ARCHIVED template) ---------------------

export const XENO_CATEGORIES: CategoryDef[] = [
  {
    key: "mis_disinfo",
    label: "Mis/disinformation",
    color: "#3299CC",
    definition:
      "False or misleading content about foreign nationals, immigration, crime, the 30 June deadline or related events, presented as factual."
  },
  {
    key: "hate_speech",
    label: "Hate speech",
    color: "#D7D733",
    definition:
      "Content that dehumanises, degrades or calls for discrimination against foreign nationals as a group on the basis of national origin, ethnicity or immigration status."
  },
  {
    key: "incitement",
    label: "Incitement to violence",
    color: "#A32D2D",
    definition:
      "Content that explicitly or implicitly calls for, encourages, glorifies or coordinates violence or property destruction targeting foreign nationals, their businesses or communities."
  }
];

export const XENO_CODED_LANGUAGE: CodedGroup[] = [
  {
    group: "Derogatory terms",
    terms: [
      "makwerekwere / kwerekwere",
      "izinyoka (snakes); amagundane (rats); imihambima (vagrants)",
      "'Zimbos', 'Mozis' in hostile context"
    ]
  },
  {
    group: "June 30 mobilisation",
    terms: [
      "'by the 30th'; 'when the time comes'; 'after the deadline'",
      "'we are ready'; 'the march' + implied action"
    ]
  },
  {
    group: "Coded action language",
    terms: [
      "'clean up' / 'hlanza'; 'reclaim our streets'",
      "'community enforcement'; 'we know where they are'; 'help us identify'"
    ]
  },
  {
    group: "Emojis & evasion",
    terms: [
      "🧹 (sweep out); 🔥 targeting; countdown emojis near 30 June",
      "misspellings: kw*rekwere, m.a.k.w.e.r.e; images of text; voice notes",
      "amabutho / regiment language + mobilisation"
    ]
  }
];

// ---- Shared defaults --------------------------------------------------------

export const DEFAULT_PLATFORMS = ["X", "Facebook", "TikTok", "YouTube", "WhatsApp", "Other"];

export const DEFAULT_CONTENT_TYPES = [
  "Post",
  "Video",
  "Live stream",
  "Photo / image",
  "Voice note",
  "Audio",
  "Comment",
  "Account / user",
  "Hashtag"
];

export const ELECTION_REPORTING_ROUTES: ReportingRoute[] = [
  { platform: "X", route: "··· → Report post → Hateful conduct / Violent speech" },
  { platform: "Facebook", route: "··· → Find support or report → Hate speech / Violence and incitement" },
  { platform: "TikTok", route: "Report in-app, and export to TSET for bulk takedown" },
  { platform: "YouTube", route: "··· → Report → Hateful or abusive content" },
  { platform: "WhatsApp", route: "Report contact / exit & report group; screenshot for the record" }
];

// TikTok TSET "Category of Community Guidelines violation" strings
// (exact values from the client's bulk-upload template dropdown).
export const TSET_CG_HATE =
  "Designated/terrorist orgs, criminal and violent behaviour, hate speech & hateful ideologies";
export const TSET_CG_MISINFO = "Misinformation, Deceptive AI content";

export const ELECTION_TSET_MAP: Record<string, string> = {
  mis_disinfo: TSET_CG_MISINFO,
  hate_speech: TSET_CG_HATE,
  incitement: TSET_CG_HATE
};

// Map an entry's content type (+ live flag) to a TSET "Category of URL" value.
export function tsetUrlCategory(entry: Pick<Entry, "contentType" | "liveStream">): string {
  if (entry.liveStream) return "LIVE";
  const ct = (entry.contentType || "").toLowerCase();
  if (ct.includes("live")) return "LIVE";
  if (ct.includes("photo") || ct.includes("image")) return "Photo";
  if (ct.includes("voice") || ct.includes("audio")) return "Audio";
  if (ct.includes("comment")) return "Comment";
  if (ct.includes("account") || ct.includes("user")) return "User";
  if (ct.includes("hashtag")) return "Hashtag";
  // Post / Video / anything else on TikTok is a video
  return "Video";
}

// Pick the TSET CG violation category for an entry, from the event's map.
export function tsetViolationCategory(
  categories: string[],
  map: Record<string, string>
): string {
  // Incitement / hate take precedence over misinfo if multiple apply.
  if (categories.includes("incitement") && map["incitement"]) return map["incitement"];
  if (categories.includes("hate_speech") && map["hate_speech"]) return map["hate_speech"];
  if (categories.includes("mis_disinfo") && map["mis_disinfo"]) return map["mis_disinfo"];
  // Fallback to first mapped category
  for (const c of categories) if (map[c]) return map[c];
  return TSET_CG_HATE;
}

// TSET date/time formatting (template uses M/D/YYYY and HH:MM:SS).
export function tsetDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
export function tsetTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toTimeString().slice(0, 8);
}
