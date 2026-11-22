// Appels d'offres et avis de marché de la Banque mondiale pour le Tchad.
// Source : API publique search.worldbank.org (procnotices), filtrée sur le pays (project_ctry_code=TD).
// Pour les avis encore ouverts, le texte intégral est analysé pour en extraire les conditions
// de candidature (portée nationale/internationale, capacité, expérience, groupements,
// bénéficiaires effectifs, garanties, mode de dépôt) et les coordonnées de l'acheteur.
// Réponse mise en cache 6 h sur le CDN Netlify, servie périmée jusqu'à 24 h pendant la mise à jour.
import { extractConditions } from "../lib/procure.ts";

const API = "https://search.worldbank.org/api/v2/procnotices";
const FIELDS = [
  "id", "notice_type", "bid_description", "project_id", "project_name", "bid_reference_no",
  "submission_date", "submission_deadline_date", "submission_deadline_time", "procurement_method_code",
  "procurement_method_name", "procurement_group", "notice_lang_name", "notice_status",
  "contact_organization", "contact_name", "contact_email", "contact_phone_no", "contact_address",
  "contact_ctry_name", "notice_text",
].join(",");

const day = (s?: string) => (s ? s.slice(0, 10) : null);

export default async () => {
  const url = `${API}?format=json&rows=200&srt=submission_date&order=desc&project_ctry_code=TD&fl=${FIELDS}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`World Bank API ${res.status}`);
    const json: any = await res.json();
    const raw = Object.values(json.procnotices ?? {}).filter((x: any) => x && x.id) as any[];
    const today = new Date().toISOString().slice(0, 10);
    const notices = raw.map((x) => {
      const deadline = day(x.submission_deadline_date);
      const isOpen = x.notice_type !== "Contract Award" && !!deadline && deadline >= today;
      const base: any = {
        id: x.id,
        type: x.notice_type ?? "",
        title: (x.bid_description ?? "").trim(),
        project_id: x.project_id ?? "",
        project: x.project_name ?? "",
        ref: x.bid_reference_no ?? "",
        published: day(x.submission_date),
        deadline,
        deadline_time: x.submission_deadline_time ?? "",
        method: x.procurement_method_name ?? "",
        method_code: x.procurement_method_code ?? "",
        group: x.procurement_group ?? "",
        lang: x.notice_lang_name ?? "",
        url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${x.id}`,
      };
      if (isOpen) {
        const ex = extractConditions(x.notice_text ?? "");
        base.contact = {
          org: x.contact_organization ?? "", name: x.contact_name ?? "", email: x.contact_email ?? "",
          phone: x.contact_phone_no ?? "", address: x.contact_address ?? "", country: x.contact_ctry_name ?? "",
        };
        base.scope = ex.scope;
        base.jv = ex.jvAllowed;
        base.conditions = ex.conditions;
      }
      return base;
    });
    return Response.json({
      source: "World Bank procurement notices API (project_ctry_code=TD)",
      fetched_at: new Date().toISOString(),
      total_available: Number(json.total ?? notices.length),
      count: notices.length,
      notices,
    }, {
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
