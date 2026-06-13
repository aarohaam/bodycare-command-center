import { writeFile } from "node:fs/promises";

const entry = `const assetFrom = (request, pathname) => {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
};

const uniq = (items) => [...new Set(items)];

const hasFileExtension = (pathname) => /\\.[a-zA-Z0-9]{2,10}$/.test(pathname);

const candidatePaths = (pathname) => {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const candidates = [normalized];

  if (!normalized.startsWith("/dist/")) {
    candidates.push(\`/dist\${normalized}\`);
  }

  if (!hasFileExtension(normalized)) {
    candidates.push("/index.html", "/dist/index.html");
  }

  return uniq(candidates);
};

const fetchFirst = async (assets, request, paths) => {
  let lastResponse;

  for (const pathname of paths) {
    const response = await assets.fetch(assetFrom(request, pathname));
    lastResponse = response;

    if (response.status !== 404) {
      return response;
    }
  }

  return lastResponse || new Response("Not found", { status: 404 });
};

export default {
  async fetch(request, env) {
    const assets = env?.ASSETS || env?.__STATIC_CONTENT;
    if (!assets?.fetch) {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }

    const url = new URL(request.url);
    return fetchFirst(assets, request, candidatePaths(url.pathname));
  },
};
`;

await writeFile("dist/index.js", entry);
