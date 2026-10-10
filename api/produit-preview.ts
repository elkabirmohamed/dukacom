interface PreviewRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

interface PreviewResponse {
  setHeader(name: string, value: string): void;
  status(code: number): PreviewResponse;
  send(body: string): void;
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
}

interface FirestoreDocument {
  fields?: Record<string, FirestoreValue>;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare const fetch: (
  input: string,
  init?: { headers?: Record<string, string>; signal?: unknown },
) => Promise<FetchResponse>;

declare const AbortSignal: {
  timeout(milliseconds: number): unknown;
};

const SITE_URL = "https://dukacom.vercel.app";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStringField(fields: Record<string, FirestoreValue>, name: string): string {
  const value = fields[name]?.stringValue;
  return typeof value === "string" ? value : "";
}

function getFormattedPrice(fields: Record<string, FirestoreValue>): string {
  const rawPrice = fields.prix_kmf?.integerValue ?? fields.prix_kmf?.doubleValue;
  const price = Number(rawPrice);
  return Number.isFinite(price)
    ? new Intl.NumberFormat("fr-FR").format(price)
    : "Prix indisponible";
}

function getPublicImageUrl(value: string): string | null {
  const imageUrl = value.trim();
  const match = /^https:\/\/([^/?#\s]+)(?:[/?#][^\s]*)?$/i.exec(imageUrl);
  return match && match[1] && !match[1].includes("@") ? imageUrl : null;
}

function renderPreviewHtml(
  title: string,
  description: string,
  pageUrl: string,
  imageUrl: string | null,
): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safePageUrl = escapeHtml(pageUrl);
  const imageMetadata = imageUrl
    ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    : "";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} | DukaCom</title>
    <meta name="description" content="${safeDescription}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safePageUrl}" />
    ${imageMetadata}
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>${safeDescription}</p>
      <a href="${safePageUrl}">Voir ce produit sur DukaCom</a>
    </main>
  </body>
</html>`;
}

export default async function handler(req: PreviewRequest, res: PreviewResponse): Promise<void> {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method not allowed");
    return;
  }

  const id = req.query.id;
  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    res.status(400).send("Invalid product id");
    return;
  }

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    res.status(500).send("Firebase public configuration is unavailable");
    return;
  }

  const documentUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/produits/${encodeURIComponent(id)}` +
    `?key=${encodeURIComponent(apiKey)}`;

  let response: FetchResponse;
  try {
    response = await fetch(documentUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    res.status(502).send("Product data is temporarily unavailable");
    return;
  }

  const pageUrl = `${SITE_URL}/produit/${encodeURIComponent(id)}`;
  if (response.status === 404) {
    res
      .status(404)
      .send(
        renderPreviewHtml(
          "Produit introuvable",
          "Ce produit n’existe pas ou n’est plus disponible sur DukaCom.",
          pageUrl,
          null,
        ),
      );
    return;
  }

  if (!response.ok) {
    res.status(502).send("Product data is temporarily unavailable");
    return;
  }

  const document = (await response.json()) as FirestoreDocument;
  const fields = document.fields ?? {};
  const title = getStringField(fields, "titre").trim() || "Produit DukaCom";
  const price = getFormattedPrice(fields);
  const description = `${price} KMF - Disponible sur DukaCom`;
  const imageUrl = getPublicImageUrl(getStringField(fields, "image_url"));

  res
    .status(200)
    .send(renderPreviewHtml(title, description, pageUrl, imageUrl));
}
