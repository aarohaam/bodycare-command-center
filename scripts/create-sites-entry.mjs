import { writeFile } from "node:fs/promises";

const entry = `const assetFrom = (request, pathname) => {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
};

export default {
  async fetch(request, env) {
    const assets = env?.ASSETS || env?.__STATIC_CONTENT;
    if (!assets?.fetch) {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }

    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const response = await assets.fetch(assetFrom(request, pathname));

    if (response.status !== 404) {
      return response;
    }

    return assets.fetch(assetFrom(request, "/index.html"));
  },
};
`;

await writeFile("dist/index.js", entry);
