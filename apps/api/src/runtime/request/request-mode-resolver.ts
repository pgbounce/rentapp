import type { RequestMode } from "./request-context";

function normalizePath(path: string) {
  const [pathname] = path.split("?");

  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function withLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function matchesPath(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function resolveRequestMode(
  path: string,
  apiPrefix: string,
): RequestMode {
  const normalizedPath = normalizePath(path);
  const prefix = withLeadingSlash(apiPrefix);
  const healthPath = `${prefix}/health`;
  const internalPath = `${prefix}/internal`;

  if (matchesPath(normalizedPath, healthPath)) {
    return "system";
  }

  if (matchesPath(normalizedPath, internalPath)) {
    return "internal";
  }

  return "public";
}
