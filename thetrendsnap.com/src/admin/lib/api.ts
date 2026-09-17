import type {
  Admin,
  Advertisement,
  Article,
  ArticleStatus,
  Category,
  ContactMessage,
  DashboardStats,
  HomepageConfig,
  ImportJob,
  MediaItem,
  Paginated,
  Subscriber,
  Tag,
} from "@/admin/types";

export const API_URL = (
  import.meta.env.VITE_API_URL || "https://admin.driftdine.com/api"
).replace(/\/+$/, "");

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://thetrendsnap.com")
).replace(/\/+$/, "");

const TOKEN_KEY = "tts-admin-token";
const ADMIN_KEY = "tts-admin-user";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  admin(): Admin | null {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      return raw ? (JSON.parse(raw) as Admin) : null;
    } catch {
      return null;
    }
  },
  save(token: string, admin: Admin) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Fired when the backend rejects the token so the shell can bounce to login. */
export const AUTH_EXPIRED_EVENT = "tts-admin-auth-expired";

function buildQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = session.token();
  const isForm = init.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    // A dead session must not leave the panel in a half-logged-in state.
    if (session.token()) {
      session.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  const type = res.headers.get("content-type") || "";

  if (!type.includes("application/json")) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
    return undefined as T;
  }

  const body = (await res.json()) as T & { message?: string };

  if (!res.ok) throw new ApiError(body?.message || `Request failed (${res.status})`, res.status);

  return body;
}

/** Downloads a binary endpoint (sample sheet, export) as a file. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = session.token();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Auth — /api/auth                                                    */
/* ------------------------------------------------------------------ */

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: Admin }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: { name: string; email: string; password: string }) =>
    request<{ message: string; admin: { id: string; email: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/* ------------------------------------------------------------------ */
/* Dashboard — /api/dashboard                                          */
/* ------------------------------------------------------------------ */

export const dashboardApi = {
  stats: () => request<DashboardStats>("/dashboard"),
};

/* ------------------------------------------------------------------ */
/* Articles — /api/news                                                */
/* ------------------------------------------------------------------ */

export interface ArticleQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: string;
  category?: string;
  subCategory?: string;
  tag?: string;
  author?: string;
  language?: string;
  country?: string;
  region?: string;
  destination?: string;
  featured?: string;
  trending?: string;
  popular?: string;
  breaking?: string;
  editorsPick?: string;
  dateFrom?: string;
  dateTo?: string;
  exclude?: string;
}

export const articlesApi = {
  list: (query: ArticleQuery = {}) =>
    request<Paginated<Article>>(`/news/list${buildQuery({ ...query })}`),

  byId: (id: string) => request<Article>(`/news/id/${id}`),

  bySlug: (slug: string) => request<Article>(`/news/${encodeURIComponent(slug)}`),

  facets: () =>
    request<{
      success: boolean;
      data: {
        regions: string[];
        countries: string[];
        languages: string[];
        authors: string[];
        destinations: string[];
      };
    }>("/news/facets"),

  search: (q: string, limit = 10) =>
    request<{ success: boolean; data: Article[] }>(`/news/search${buildQuery({ q, limit })}`),

  create: (payload: Partial<Article>) =>
    request<Article>("/news", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<Article>) =>
    request<Article>(`/news/id/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  changeStatus: (id: string, status: ArticleStatus) =>
    request<{ success: boolean; data: Article }>(`/news/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  duplicate: (id: string) =>
    request<{ success: boolean; data: Article }>(`/news/${id}/duplicate`, { method: "POST" }),

  trash: (id: string) =>
    request<{ success: boolean; message: string }>(`/news/${id}/trash`, { method: "POST" }),

  restore: (id: string, status: ArticleStatus = "draft") =>
    request<{ success: boolean; data: Article }>(`/news/${id}/restore`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  remove: (id: string) => request<{ message: string }>(`/news/${id}`, { method: "DELETE" }),

  bulkStatus: (ids: string[], status: ArticleStatus) =>
    request<{ success: boolean; modified: number }>("/news/bulk/status", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),

  bulkCategory: (ids: string[], category?: string, subCategory?: string | null) =>
    request<{ success: boolean; modified: number }>("/news/bulk/category", {
      method: "POST",
      body: JSON.stringify({ ids, category, subCategory }),
    }),

  bulkTags: (ids: string[], tags: string[], mode: "add" | "replace" | "remove" = "add") =>
    request<{ success: boolean; modified: number }>("/news/bulk/tags", {
      method: "POST",
      body: JSON.stringify({ ids, tags, mode }),
    }),

  bulkFlags: (ids: string[], flags: Record<string, boolean>) =>
    request<{ success: boolean; modified: number }>("/news/bulk/flags", {
      method: "POST",
      body: JSON.stringify({ ids, flags }),
    }),

  bulkDelete: (ids: string[]) =>
    request<{ success: boolean; deleted: number }>("/news/bulk/delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};

/* ------------------------------------------------------------------ */
/* Categories — /api/categories                                        */
/* ------------------------------------------------------------------ */

export const categoriesApi = {
  list: (opts: { status?: string; withCounts?: boolean; parent?: string } = {}) =>
    request<Category[]>(
      `/categories${buildQuery({
        status: opts.status ?? "all",
        withCounts: opts.withCounts ? "true" : undefined,
        parent: opts.parent,
        admin: "true",
      })}`
    ),

  tree: (status = "all") =>
    request<{ success: boolean; data: Category[] }>(`/categories/tree${buildQuery({ status })}`),

  get: (idOrSlug: string) =>
    request<Category | { success: boolean; data: Category }>(`/categories/${idOrSlug}`),

  create: (payload: Partial<Category>) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<Category>) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  toggleVisibility: (id: string) =>
    request<{ success: boolean; data: Category }>(`/categories/${id}/visibility`, {
      method: "PATCH",
    }),

  reorder: (items: Array<{ id: string; order: number; parent?: string | null }>) =>
    request<{ success: boolean }>("/categories/reorder", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  remove: (id: string) => request<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/* Tags — /api/tags                                                    */
/* ------------------------------------------------------------------ */

export const tagsApi = {
  list: (opts: { page?: number; limit?: number; search?: string; sort?: string; status?: string } = {}) =>
    request<Paginated<Tag>>(`/tags${buildQuery({ limit: 200, status: "all", ...opts })}`),

  create: (payload: Partial<Tag>) =>
    request<{ success: boolean; data: Tag }>("/tags", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<Tag>) =>
    request<{ success: boolean; data: Tag }>(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  merge: (sourceIds: string[], targetId: string) =>
    request<{ success: boolean; message?: string }>("/tags/merge", {
      method: "POST",
      body: JSON.stringify({ sourceIds, targetId }),
    }),

  recount: () => request<{ success: boolean; message?: string }>("/tags/recount", { method: "POST" }),

  bulkDelete: (ids: string[]) =>
    request<{ success: boolean; deleted?: number }>("/tags/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  remove: (id: string) =>
    request<{ success: boolean; message?: string }>(`/tags/${id}`, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/* Media — /api/media                                                  */
/* ------------------------------------------------------------------ */

export const mediaApi = {
  list: (opts: { page?: number; limit?: number; search?: string; folder?: string; type?: string; sort?: string } = {}) =>
    request<Paginated<MediaItem>>(`/media${buildQuery({ limit: 40, ...opts })}`),

  folders: () => request<{ success: boolean; data: Array<{ folder: string; count: number }> }>("/media/folders"),

  get: (id: string) => request<{ success: boolean; data: MediaItem }>(`/media/${id}`),

  upload: (file: File, meta: Record<string, string> = {}) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(meta).forEach(([k, v]) => v && form.append(k, v));
    return request<{ success: boolean; data: MediaItem }>("/media/upload", {
      method: "POST",
      body: form,
    });
  },

  uploadMany: (files: File[], meta: Record<string, string> = {}) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    Object.entries(meta).forEach(([k, v]) => v && form.append(k, v));
    return request<{ success: boolean; count: number; data: MediaItem[] }>("/media/upload-multiple", {
      method: "POST",
      body: form,
    });
  },

  registerExternal: (payload: {
    url: string;
    name?: string;
    folder?: string;
    alt?: string;
    caption?: string;
    title?: string;
    credit?: string;
    redirectUrl?: string;
  }) =>
    request<{ success: boolean; data: MediaItem }>("/media/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<MediaItem>) =>
    request<{ success: boolean; data: MediaItem }>(`/media/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  replace: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ success: boolean; data: MediaItem }>(`/media/${id}/replace`, {
      method: "PUT",
      body: form,
    });
  },

  remove: (id: string) =>
    request<{ success: boolean; message?: string }>(`/media/${id}`, { method: "DELETE" }),

  bulkDelete: (ids: string[]) =>
    request<{ success: boolean; deleted?: number }>("/media/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};

/* ------------------------------------------------------------------ */
/* Advertisements — /api/ads                                           */
/* ------------------------------------------------------------------ */

export const adsApi = {
  list: (opts: { position?: string; status?: string } = {}) =>
    request<{ success: boolean; data: Advertisement[]; positions: string[] }>(
      `/ads${buildQuery(opts)}`
    ),

  create: (payload: Partial<Advertisement>) =>
    request<{ success: boolean; data: Advertisement }>("/ads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<Advertisement>) =>
    request<{ success: boolean; data: Advertisement }>(`/ads/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    request<{ success: boolean; message?: string }>(`/ads/${id}`, { method: "DELETE" }),

  serve: (position: string, device?: string) =>
    request<{ success: boolean; data: Advertisement[] }>(`/ads/serve${buildQuery({ position, device })}`),
};

/* ------------------------------------------------------------------ */
/* Homepage — /api/homepage                                            */
/* ------------------------------------------------------------------ */

export const homepageApi = {
  get: () => request<HomepageConfig>("/homepage"),
  update: (payload: HomepageConfig) =>
    request<HomepageConfig>("/homepage", { method: "PUT", body: JSON.stringify(payload) }),
};

/* ------------------------------------------------------------------ */
/* Contacts — /api/contact                                             */
/* ------------------------------------------------------------------ */

export const contactApi = {
  list: () => request<ContactMessage[] | { success: boolean; data: ContactMessage[] }>("/contact"),
  reply: (id: string, message: string) =>
    request<{ message?: string }>(`/contact/reply/${id}`, {
      method: "PUT",
      body: JSON.stringify({ message }),
    }),
  remove: (id: string) => request<{ message?: string }>(`/contact/${id}`, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/* Newsletter — /api/newsletter                                        */
/* ------------------------------------------------------------------ */

export const newsletterApi = {
  list: (opts: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    request<Paginated<Subscriber>>(`/newsletter${buildQuery({ limit: 100, ...opts })}`),
  remove: (id: string) =>
    request<{ success: boolean; message?: string }>(`/newsletter/${id}`, { method: "DELETE" }),
  subscribe: (email: string, source = "admin") =>
    request<{ success: boolean }>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email, source }),
    }),
};

/* ------------------------------------------------------------------ */
/* Import — /api/import                                                */
/* ------------------------------------------------------------------ */

export const importApi = {
  sample: () => downloadFile("/import/sample", "thetrendsnap-import-template.xlsx"),
  export: () => downloadFile("/import/export", "thetrendsnap-articles.xlsx"),

  history: (limit = 25) =>
    request<{ success: boolean; data: ImportJob[] }>(`/import/history${buildQuery({ limit })}`),

  status: (batchId: string) =>
    request<{ success: boolean; data: ImportJob }>(`/import/${batchId}`),

  validate: (file: File, mode: "create" | "upsert" = "upsert") => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    return request<{ success: boolean; data: ImportJob }>("/import/validate", {
      method: "POST",
      body: form,
    });
  },

  run: (file: File, mode: "create" | "upsert" = "upsert") => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    return request<{ success: boolean; data: ImportJob }>("/import/run", {
      method: "POST",
      body: form,
    });
  },

  rollback: (batchId: string) =>
    request<{ success: boolean; message?: string }>(`/import/${batchId}/rollback`, {
      method: "POST",
    }),
};

/* ------------------------------------------------------------------ */
/* Automation — /api/auto-news                                         */
/* ------------------------------------------------------------------ */

export const automationApi = {
  run: () => request<{ message: string; count: number }>("/auto-news/run", { method: "POST" }),
};

export { request as apiRequest, buildQuery };
