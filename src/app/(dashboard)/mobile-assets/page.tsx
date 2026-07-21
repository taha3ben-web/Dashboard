"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
type R = {
  id: string;
  key: string;
  kind: string;
  version: number;
  etag: string;
  bytes: number;
};
export default function Page() {
  const [rows, setRows] = useState<R[]>([]),
    [file, setFile] = useState<File | null>(null),
    [key, setKey] = useState(""),
    [kind, setKind] = useState("VEHICLE"),
    [error, setError] = useState("");
  const load = () =>
    api
      .get("/managed-assets")
      .then((x) => setRows(x.data))
      .catch((e) => setError(getApiErrorMessage(e)));
  useEffect(() => {
    void load();
  }, []);
  async function upload() {
    if (!file || !key) return;
    try {
      const meta = { key, kind, audience: "PASSENGER", contentType: file.type },
        { data } = await api.post("/managed-assets/prepare", meta);
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      await api.post("/managed-assets/finalize", {
        ...meta,
        objectPath: data.objectPath,
      });
      setKey("");
      setFile(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }
  return (
    <>
      <Topbar title="أصول تطبيق الراكب" />
      <main className="space-y-5 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
        <section className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-lg border p-2"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border p-2"
          >
            {[
              "VEHICLE",
              "ICON",
              "NOTIFICATION",
              "SERVICE",
              "WALLET",
              "PROFILE",
              "BRAND",
              "SPLASH",
              "OTHER",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border p-2"
          />
          <button
            onClick={upload}
            disabled={!file || !key}
            className="rounded-lg bg-slate-950 p-2 text-white disabled:opacity-40"
          >
            رفع ونشر
          </button>
        </section>
        <table className="w-full text-sm">
          {rows.map((x) => (
            <tbody key={x.id}>
              <tr className="border-t">
                <td className="p-3 font-mono">{x.key}</td>
                <td>{x.kind}</td>
                <td>v{x.version}</td>
                <td>{x.bytes}</td>
              </tr>
            </tbody>
          ))}
        </table>
      </main>
    </>
  );
}
