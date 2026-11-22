// /api/voix : catalogue « Les voix » lu en direct dans Airtable (base Tchad Open Data).
// Nécessite la variable d'environnement AIRTABLE_TOKEN (jeton personnel en lecture seule,
// portée data.records:read sur la base appfjYjsJjGwSF4jV). Sans jeton, renvoie 503 et
// le site affiche l'instantané embarqué dans la page.
const BASE = "appfjYjsJjGwSF4jV";
const T_WORKS = "tbl4bDE4TwhzySWoB";
const T_PEOPLE = "tbl8zCaYYUN8NGcRW";
const F = {
  title: "fldKjNDGiQJ5ngVvT", type: "fldHbcnJFNve7kLZw", year: "fldA4BGiRRZFjggH0",
  dom: "fldMPkbONqpTRAyg7", theme: "fldpVGUKgw5JjHutm", lang: "fldQdKf5xoBk6CGdz",
  url: "fldBUhrQEQMpCpoQP", summary: "fld5KCAeaDbaLRjRf", prize: "fldaIvJRGw2V5shL5",
  imp: "fldjgclLz9eHV5GDg", authors: "fldQGHjsFoVAtc87X",
  pName: "fld6QnoVSqihmfSdh", pRole: "fldgRMaCJItlEGejG", pNat: "fldgtRxgpapaLU4og",
  pBio: "fldjRecWo6BGE80YO", pYears: "fldmORfDPsrrotDtt", pSite: "flduSuuOYXAgbkWB3"
};

async function all(table: string, token: string) {
  const out: any[] = [];
  let offset = "";
  do {
    const u = `https://api.airtable.com/v0/${BASE}/${table}?returnFieldsByFieldId=true&pageSize=100${offset ? "&offset=" + offset : ""}`;
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Airtable ${r.status}`);
    const j = await r.json();
    out.push(...j.records);
    offset = j.offset || "";
  } while (offset);
  return out;
}

const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[];

export default async () => {
  const token = Netlify.env.get("AIRTABLE_TOKEN");
  if (!token) return Response.json({ error: "AIRTABLE_TOKEN manquant" }, { status: 503 });
  try {
    const [w, p] = await Promise.all([all(T_WORKS, token), all(T_PEOPLE, token)]);
    const works = w.map(r => {
      const f = r.fields;
      return {
        id: r.id, t: f[F.title] || "", ty: f[F.type] || "", y: f[F.year] || "",
        dom: arr(f[F.dom]), th: arr(f[F.theme]), lg: arr(f[F.lang]), url: f[F.url] || "",
        sum: f[F.summary] || "", prize: f[F.prize] || "", imp: f[F.imp] || 0, au: arr(f[F.authors])
      };
    }).filter(x => x.t);
    const people: Record<string, unknown> = {};
    p.forEach(r => {
      const f = r.fields;
      people[r.id] = { n: f[F.pName] || "", r: arr(f[F.pRole]), nat: f[F.pNat] || "", yr: f[F.pYears] || "", bio: f[F.pBio] || "", url: f[F.pSite] || "" };
    });
    return Response.json({ asof: new Date().toISOString().slice(0, 10), live: true, works, people }, {
      headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "Cache-Control": "public, max-age=300" }
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};

export const config = { path: "/api/voix" };
