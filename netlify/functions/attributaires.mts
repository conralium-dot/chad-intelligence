// Annuaire des attributaires : entreprises et consultants qui ont remporté des marchés
// financés par la Banque mondiale au Tchad, lus dans les avis d'attribution (« Contract Award »).
// Sert à repérer des partenaires (groupement, sous-traitance) ou des concurrents.
// Mise en cache 24 h sur le CDN Netlify.
import { extractAwards } from "../lib/procure.ts";

const API = "https://search.worldbank.org/api/v2/procnotices";
const FL = "id,notice_text,procurement_group,procurement_method_code,procurement_method_name,submission_date,noticedate,project_id,project_name,bid_description";
const ROWS = 250, MAX = 1500;

const page = async (os: number) => {
  const u = `${API}?format=json&rows=${ROWS}&os=${os}&srt=submission_date&order=desc&project_ctry_code=TD&notice_type=Contract%20Award&fl=${FL}`;
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`World Bank API ${r.status}`);
  return r.json() as Promise<any>;
};

export default async () => {
  try {
    const first = await page(0);
    const total = Math.min(Number(first.total ?? 0), MAX);
    const offs: number[] = [];
    for (let os = ROWS; os < total; os += ROWS) offs.push(os);
    const rest = await Promise.allSettled(offs.map(page));
    const pages = [first, ...rest.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<any>).value)];
    const notices = pages.flatMap(p => Object.values(p.procnotices ?? {}).filter((x: any) => x && x.id)) as any[];

    const firms = new Map<string, any>();
    let parsed = 0;
    for (const n of notices) {
      const aw = extractAwards(n.notice_text ?? "");
      if (aw.length) parsed++;
      const date = (n.submission_date ?? "").slice(0, 10);
      for (const a of aw) {
        const key = a.fid || a.name.toUpperCase();
        const f = firms.get(key) ?? { id: a.fid, name: a.name, country: a.country, wins: 0, groups: {} as Record<string, number>, totals: {} as Record<string, number>, last: "", projects: new Set<string>(), recent: [] as any[] };
        f.wins++;
        if (n.procurement_group) f.groups[n.procurement_group] = (f.groups[n.procurement_group] ?? 0) + 1;
        if (a.price != null && a.cur) f.totals[a.cur] = (f.totals[a.cur] ?? 0) + a.price;
        if (date > f.last) f.last = date;
        if (n.project_id) f.projects.add(n.project_id);
        if (f.recent.length < 3) f.recent.push({ title: (n.bid_description ?? "").trim(), date, price: a.price, cur: a.cur, url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}` });
        if (!f.country && a.country) f.country = a.country;
        firms.set(key, f);
      }
    }
    const list = [...firms.values()].map(f => ({ ...f, projects: f.projects.size })).sort((a, b) => b.wins - a.wins || b.last.localeCompare(a.last));
    return Response.json({
      source: "World Bank procurement notices API, Contract Award notices (project_ctry_code=TD)",
      fetched_at: new Date().toISOString(),
      awards_total: Number(first.total ?? 0),
      awards_read: notices.length,
      awards_parsed: parsed,
      firms: list,
    }, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
      },
    });
  } catch (err) {
    return Response.json({ error: "Flux indisponible", detail: String(err) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
};

export const config = { path: "/api/attributaires" };
