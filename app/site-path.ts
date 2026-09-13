const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

export function siteHref(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

export function appRoute(url: string) {
  if (!basePath) return url || "/mechanisms";
  return url.startsWith(basePath) ? url.slice(basePath.length) || "/mechanisms" : url;
}

