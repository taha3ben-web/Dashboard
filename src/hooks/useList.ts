"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Paginated } from "@/lib/catalog";

export interface ListQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status: string;
  activeOnly: boolean;
  includeDeleted: boolean;
  [key: string]: string | number | boolean;
}

export const DEFAULT_QUERY: ListQuery = {
  page: 1,
  limit: 20,
  search: "",
  sortBy: "",
  sortOrder: "asc",
  status: "",
  activeOnly: false,
  includeDeleted: false,
};

/**
 * خطاف جلب قوائم موحّد: بحث + ترقيم + ترتيب + ترشيح.
 * يتعامل مع شكل الإرجاع الموحّد { data, total, page, limit, pages }.
 * يزيل المفاتيح الفارغة حتى لا ترفضها سياسة whitelist في الباك-إند.
 */
export function useList<T>(
  path: string,
  initial: Partial<ListQuery> = {},
) {
  const [query, setQueryState] = useState<ListQuery>({
    ...DEFAULT_QUERY,
    ...initial,
  });
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  const buildParams = useCallback((q: ListQuery) => {
    const params: Record<string, string | number> = {
      page: q.page,
      limit: q.limit,
      sortOrder: q.sortOrder,
    };
    if (q.search.trim()) params.search = q.search.trim();
    if (q.sortBy) params.sortBy = q.sortBy;
    if (q.status) params.status = q.status;
    if (q.activeOnly) params.activeOnly = "true";
    if (q.includeDeleted) params.includeDeleted = "true";
    // مفاتيح إضافية (مثل categoryId / vehicleTypeId).
    for (const k of Object.keys(q)) {
      if (k in DEFAULT_QUERY) continue;
      const v = q[k];
      if (v !== "" && v !== false && v !== undefined && v !== null) {
        params[k] = v as string | number;
      }
    }
    return params;
  }, []);

  const load = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    api
      .get<Paginated<T>>(path, { params: buildParams(query) })
      .then((r) => {
        if (id !== reqId.current) return; // تجاهل الاستجابات القديمة
        const d = r.data;
        setData(d.data ?? []);
        setTotal(d.total ?? 0);
        setPages(d.pages ?? 1);
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setError("تعذّر تحميل البيانات");
        setData([]);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [path, query, buildParams]);

  useEffect(() => {
    load();
  }, [load]);

  const setQuery = useCallback((patch: Partial<ListQuery>) => {
    setQueryState((prev) => {
      const next = { ...prev, ...patch };
      // أي تغيير غير رقم الصفحة يعيد الترقيم للصفحة الأولى.
      if (!("page" in patch)) next.page = 1;
      return next;
    });
  }, []);

  return {
    data,
    total,
    pages,
    loading,
    error,
    query,
    setQuery,
    reload: load,
  };
}
