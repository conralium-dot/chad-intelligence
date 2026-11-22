// Outils partagés : conversion du texte HTML des avis Banque mondiale, extraction
// des conditions de candidature (FR/EN) et lecture des attributaires dans les avis d'attribution.

const ENT: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  laquo: "«", raquo: "»", bull: "•", ndash: "–", mdash: "—", hellip: "…", deg: "°", euro: "€", oelig: "œ", OElig: "Œ",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", Eacute: "É", Egrave: "È", Ecirc: "Ê", agrave: "à", acirc: "â", auml: "ä",
  Agrave: "À", Acirc: "Â", icirc: "î", iuml: "ï", Icirc: "Î", ocirc: "ô", ouml: "ö", Ocirc: "Ô", ugrave: "ù", ucirc: "û",
  uuml: "ü", Ucirc: "Û", ccedil: "ç", Ccedil: "Ç", rsaquo: "›", lsaquo: "‹", middot: "·", times: "×", sup2: "²", ordm: "º"
};
export const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
   .replace(/&([a-z]+\d?);/gi, (m, n) => ENT[n] ?? m);

export function htmlToText(html: string): string {
  return decode(
    html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d|table)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<td[^>]*>/gi, " | ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function sentences(text: string): string[] {
  return text.split(/\n|(?<=[.;:])\s+(?=[A-ZÀ-Ý•(0-9])|\s•\s/)
    .map(s => s.replace(/^[•\-–\s]+/, "").trim())
    .filter(s => s.length > 12);
}

const RULES: Record<string, RegExp> = {
  scope: /(appel d.offres?|consultation|demande de (cotations?|propositions?)).{0,40}(nationa|internationa)|(national|international) (open )?competitive|concurrence (nationale|internationale)|approche (nationale|internationale)|\baon\b|\baoi\b|\bao[nio] ?ouvert/,
  elig: /nationalit|pays (non )?eligibles?|eligible countr|ressortissant|ouvert a tous|open to all|soumissionnaires? eligibles?|eligible (bidders|firms|consultants)|criteres? d.eligibilite|eligibility|exclu|sanction|debarr/,
  capacity: /chiffre d.affaires|turnover|capacite financiere|financial (capacity|resources)|ligne de credit|line of credit|liquidit|fonds de roulement|working capital|bilans?|states? financ|etats financiers/,
  experience: /experience|marches? similaires|similar (contracts|assignments|projects)|missions? similaires|references|annees d.existence|years in business|personnel cle|key (staff|experts|personnel)|materiel|equipment/,
  jv: /groupement|joint.?venture|consortium|sous.?trait|sub.?contract|association avec|en association|co.?traitan/,
  owner: /beneficiaires? effectifs?|beneficial owner|actionna|shareholder|entreprises? publiques?|state.?owned|capital social/,
  money: /garantie (de |d.)?(l.)?(offre|soumission)|bid.?secur|declaration de garantie|bid.?securing|non rembours|non.?refundable|montant de|somme de|frais de|cout du dossier|cost of the|validite|validity/,
  submit: /electronique|electronic|e.?procurement|\bstep\b|copie papier|hard cop|depos|deliver|soumis|submit|adresse|address|courriel|e.?mail|plateforme|en ligne|online|ouverture des (plis|offres)|bid opening|redige|langue|language/,
  visit: /visite (des lieux|du site|de site)|site visit|reunion (preparatoire|prealable|d.information)|pre.?bid|pre.?proposal/,
  pref: /marge de preference|preference (nationale|domestique)|domestic preference/,
  gender: /exploitation et (les )?abus sexuels|harcelement sexuel|sexual (exploitation|harassment)|eas\/hs|sea\/sh/
};

export type Conditions = Record<string, string[]>;

export function extractConditions(html: string): { conditions: Conditions; scope: "national" | "international" | ""; jvAllowed: boolean | null; words: number } {
  const text = htmlToText(html || "");
  const sents = sentences(text);
  const used = new Set<number>();
  const conditions: Conditions = {};
  for (const [k, re] of Object.entries(RULES)) {
    const hits: string[] = [];
    sents.forEach((s, i) => {
      if (hits.length >= 3 || used.has(i)) return;
      if (re.test(fold(s))) { hits.push(s.length > 300 ? s.slice(0, 297).trimEnd() + "…" : s); if (k !== "scope") used.add(i); }
    });
    if (hits.length) conditions[k] = hits;
  }
  const f = fold(text);
  let scope: "national" | "international" | "" = "";
  if (/(appel d.offres?|concurrence|approche|consultation)[^.]{0,30}internationa|international (open )?competitive|\baoi\b/.test(f)) scope = "international";
  else if (/(appel d.offres?|concurrence|approche|consultation)[^.]{0,30}nationa|national (open )?competitive|\baon\b/.test(f)) scope = "national";
  let jvAllowed: boolean | null = null;
  if (/groupements? (ne sont pas|non) (autorise|admis|accepte)|joint.?ventures? (are|is) not (allowed|permitted|eligible)/.test(f)) jvAllowed = false;
  else if (/groupement|joint.?venture|consortium/.test(f)) jvAllowed = true;
  return { conditions, scope, jvAllowed, words: text.split(/\s+/).length };
}

export type Award = { name: string; fid: string; country: string; price: number | null; cur: string };

// Avis d'attribution : bloc « Awarded Bidder(s) / Firm(s) / Consultant(s) » puis « Name (ID) », « Country: X », « Signed Contract price XAF 123 ».
export function extractAwards(html: string): Award[] {
  if (!html) return [];
  const start = html.search(/Awarded (Bidder|Firm|Consultant|Supplier|Contractor)/i);
  if (start < 0) return [];
  let block = html.slice(start);
  const end = block.search(/(Evaluated|Rejected|Unsuccessful) (Bidder|Firm|Consultant)/i);
  if (end > 0) block = block.slice(0, end);
  const out: Award[] = [];
  const re = /<b>\s*([^<]{2,200}?)\s*\((\d{3,})\)\s*<\/b>([\s\S]*?)(?=<b>\s*[^<]{2,200}?\(\d{3,}\)\s*<\/b>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const rest = htmlToText(m[3]);
    const country = (rest.match(/Country\s*:\s*([^\n|]+?)(?:\s{2,}|\n|\||Bid|Evaluated|Signed|$)/i)?.[1] || "").trim();
    const pm = rest.match(/Signed Contract price\s*:?\s*([A-Z]{3})\s*([\d.,\s]+)/i) || rest.match(/Evaluated Bid Price\s*:?\s*([A-Z]{3})\s*([\d.,\s]+)/i) || rest.match(/Bid Price at Opening\s*:?\s*([A-Z]{3})\s*([\d.,\s]+)/i);
    const price = pm ? Number(pm[2].replace(/[\s,]/g, "")) : null;
    out.push({ name: decode(m[1]).replace(/\s+/g, " ").trim(), fid: m[2], country, price: Number.isFinite(price as number) ? price : null, cur: pm ? pm[1].toUpperCase() : "" });
  }
  return out;
}
