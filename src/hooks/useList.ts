"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Paginated } from "@/lib/catalog";

/**
 * استعلام قوائم موحّد: بحث + ترقيم + ترتيب + ترشيح.
 * الحقول معرّفة صراحةً (بلا index signature) لتوافق TypeScript الكامل
 * دون السماح بقيم undefined، ومطابقة ListQueryDto في الباك-إند تمامًا.
 */
export interface ListQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status: string;
  activeOnly: boolean;
  includeDeleted: boolean;
  // مُرشّحات اختيارية خاصة ببعض القوائم (تطابق الباك-إند).
  categoryId?: string;
  vehicleTypeId?: string;
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

export function useList<T>(path: string, initial: Partial<ListQuery> = {}) {
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
    // يزيل المفاتيح الفارغة حتى لا ترفضها سياسة whitelist في الباك-إند.
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
    if (q.categoryId) params.categoryId = q.categoryId;
    if (q.vehicleTypeId) params.vehicleTypeId = q.vehicleTypeId;
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
      const next: ListQuery = { ...prev, ...patch };
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
