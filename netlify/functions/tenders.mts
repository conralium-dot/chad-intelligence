// Appels d'offres et avis de marché de la Banque mondiale pour le Tchad.
// Source : API publique search.worldbank.org (procnotices), filtrée sur le pays (project_ctry_code=TD).
// Réponse mise en cache 6 h sur le CDN Netlify, servie périmée jusqu'à 24 h pendant la mise à jour.

const API = "https://search.worldbank.org/api/v2/procnotices";
const FIELDS = [
  "id", "notice_type", "bid_description", "project_id", "project_name",
  "submission_date", "submission_deadline_date", "procurement_method_name",
  "procurement_group", "notice_lang_name",
].join(",");

type Notice = {
  id: string; type: string; title: string; project_id: string; project: string;
  published: string | null; deadline: string | null; method: string; group: string; lang: string; url: string;
};

const day = (s?: string) => (s ? s.slice(0, 10) : null);

export default async (req: Request) => {
  const rows = 200;
  const url = `${API}?format=json&rows=${rows}&srt=submission_date&order=desc&project_ctry_code=TD&fl=${FIELDS}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`World Bank API ${res.status}`);
    const json: any = await res.json();
    const raw = Object.values(json.procnotices ?? {}).filter((x: any) => x && x.id) as any[];
    const notices: Notice[] = raw.map((x) => ({
      id: x.id,
      type: x.notice_type ?? "",
      title: (x.bid_description ?? "").trim(),
      project_id: x.project_id ?? "",
      project: x.project_name ?? "",
      published: day(x.submission_date),
      deadline: day(x.submission_deadline_date),
      method: x.procurement_method_name ?? "",
      group: x.procurement_group ?? "",
      lang: x.notice_lang_name ?? "",
      url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${x.id}`,
    }));
    const body = {
      source: "World Bank procurement notices API (project_ctry_code=TD)",
      fetched_at: new Date().toISOString(),
      total_available: Number(json.total ?? notices.length),
      count: notices.length,
      notices,
    };
    return Response.json(body, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Le flux de la Banque mondiale est indisponible pour le moment.", detail: String(err) },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
};

export const config = { path: "/api/tenders" };
