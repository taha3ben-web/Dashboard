"use client";

import type { Dispatch, SetStateAction } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { dateTime, num } from "@/lib/format";
import type {
  AgentEditorState,
  AgentRow,
  AuditRow,
  CityOption,
  PasswordState,
  StatusState,
} from "./agents.types";

const EMPTY_EDITOR: AgentEditorState = {
  open: false,
  agent: null,
  name: "",
  phone: "",
  agentCode: "",
  cityId: "",
  notes: "",
};
const EMPTY_PASSWORD: PasswordState = {
  open: false,
  agent: null,
  password: "",
  confirmPassword: "",
};
const EMPTY_STATUS: StatusState = {
  open: false,
  agent: null,
  nextStatus: "ACTIVE",
  notes: "",
};

interface Props {
  cities: CityOption[];
  editor: AgentEditorState;
  setEditor: Dispatch<SetStateAction<AgentEditorState>>;
  passwordEditor: PasswordState;
  setPasswordEditor: Dispatch<SetStateAction<PasswordState>>;
  statusEditor: StatusState;
  setStatusEditor: Dispatch<SetStateAction<StatusState>>;
  busyAction: string;
  updateAgent: () => Promise<void>;
  updatePassword: () => Promise<void>;
  updateStatus: () => Promise<void>;
  detailsOpen: boolean;
  closeDetails: () => void;
  selectedAgent: AgentRow | null;
  auditRows: AuditRow[];
  auditColumns: Column<AuditRow>[];
  detailsLoading: boolean;
  auditPage: number;
  auditPages: number;
  auditTotal: number;
  loadDetails: (agentId: string, page: number) => Promise<void>;
}

export function AgentModals(props: Props) {
  const {
    cities,
    editor,
    setEditor,
    passwordEditor,
    setPasswordEditor,
    statusEditor,
    setStatusEditor,
    busyAction,
    updateAgent,
    updatePassword,
    updateStatus,
    detailsOpen,
    closeDetails,
    selectedAgent,
    auditRows,
    auditColumns,
    detailsLoading,
    auditPage,
    auditPages,
    auditTotal,
    loadDetails,
  } = props;

  return (
    <>
      <Modal
        open={editor.open}
        onClose={() => setEditor(EMPTY_EDITOR)}
        title="تعديل بيانات الوكيل"
        footer={
          <>
            <button
              onClick={() => setEditor(EMPTY_EDITOR)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void updateAgent()}
              disabled={
                busyAction === "update-agent" ||
                !editor.name ||
                !editor.phone ||
                !editor.agentCode
              }
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "update-agent" ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={editor.name}
            onChange={(event) =>
              setEditor({ ...editor, name: event.target.value })
            }
            placeholder="الاسم"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={editor.phone}
            onChange={(event) =>
              setEditor({ ...editor, phone: event.target.value })
            }
            placeholder="الهاتف"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={editor.agentCode}
            onChange={(event) =>
              setEditor({
                ...editor,
                agentCode: event.target.value.toUpperCase(),
              })
            }
            placeholder="رمز الوكيل"
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={editor.cityId}
            onChange={(event) =>
              setEditor({ ...editor, cityId: event.target.value })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">بدون مدينة</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <textarea
            value={editor.notes}
            onChange={(event) =>
              setEditor({ ...editor, notes: event.target.value })
            }
            rows={4}
            placeholder="ملاحظات"
            className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </Modal>

      <Modal
        open={passwordEditor.open}
        onClose={() => setPasswordEditor(EMPTY_PASSWORD)}
        title={`تغيير كلمة مرور ${passwordEditor.agent?.user.name ?? "الوكيل"}`}
        footer={
          <>
            <button
              onClick={() => setPasswordEditor(EMPTY_PASSWORD)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void updatePassword()}
              disabled={busyAction === "update-password"}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "update-password"
                ? "جارٍ الحفظ..."
                : "تحديث كلمة المرور"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="password"
            value={passwordEditor.password}
            onChange={(event) =>
              setPasswordEditor({
                ...passwordEditor,
                password: event.target.value,
              })
            }
            placeholder="كلمة المرور الجديدة"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            value={passwordEditor.confirmPassword}
            onChange={(event) =>
              setPasswordEditor({
                ...passwordEditor,
                confirmPassword: event.target.value,
              })
            }
            placeholder="تأكيد كلمة المرور"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <p className="text-xs text-gray-500">
            سيتم إبطال توكنات التحديث وإنهاء جلسات الوكيل بعد التغيير.
          </p>
        </div>
      </Modal>

      <Modal
        open={statusEditor.open}
        onClose={() => setStatusEditor(EMPTY_STATUS)}
        title="تغيير حالة الوكيل"
        footer={
          <>
            <button
              onClick={() => setStatusEditor(EMPTY_STATUS)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void updateStatus()}
              disabled={busyAction === "update-status"}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "update-status" ? "جارٍ الحفظ..." : "تأكيد"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm">
            سيتم تغيير حالة <strong>{statusEditor.agent?.user.name}</strong> إلى{" "}
            <strong>{statusEditor.nextStatus}</strong>.
          </div>
          <textarea
            value={statusEditor.notes}
            onChange={(event) =>
              setStatusEditor({ ...statusEditor, notes: event.target.value })
            }
            rows={4}
            placeholder="ملاحظات الحالة"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          {statusEditor.nextStatus !== "ACTIVE" ? (
            <p className="text-xs text-amber-600">
              سيتم إنهاء جلسات الوكيل وإبطال توكنات التحديث.
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={detailsOpen}
        onClose={closeDetails}
        title="تفاصيل الوكيل وسجل التغييرات"
        size="lg"
      >
        {selectedAgent ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50 md:grid-cols-3">
              <Info label="الاسم" value={selectedAgent.user.name} />
              <Info label="الهاتف" value={selectedAgent.user.phone} />
              <Info label="الرمز" value={selectedAgent.agentCode} mono />
              <div>
                <span className="text-gray-500">الحالة</span>
                <div>
                  <StatusBadge status={selectedAgent.status} />
                </div>
              </div>
              <Info label="المدينة" value={selectedAgent.city?.name ?? "-"} />
              <Info
                label="الدور"
                value={selectedAgent.user.staffRole?.name ?? "-"}
              />
              <Info
                label="آخر دخول"
                value={dateTime(selectedAgent.lastLoginAt)}
              />
              <Info
                label="أنشئ بواسطة"
                value={selectedAgent.createdBy?.name ?? "-"}
              />
              <Info
                label="تاريخ الإنشاء"
                value={dateTime(selectedAgent.createdAt)}
              />
              <div className="md:col-span-3">
                <span className="text-gray-500">الملاحظات</span>
                <div>{selectedAgent.notes || "-"}</div>
              </div>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">سجل التغييرات</h3>
              <DataTable
                columns={auditColumns}
                rows={auditRows}
                loading={detailsLoading}
                empty="لا توجد تغييرات مسجلة"
              />
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>
                  الصفحة {num(auditPage)} من {num(auditPages)} · الإجمالي{" "}
                  {num(auditTotal)}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1 || detailsLoading}
                    onClick={() =>
                      void loadDetails(selectedAgent.id, auditPage - 1)
                    }
                  >
                    السابق
                  </button>
                  <button
                    disabled={auditPage >= auditPages || detailsLoading}
                    onClick={() =>
                      void loadDetails(selectedAgent.id, auditPage + 1)
                    }
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <div className={mono ? "font-mono" : undefined}>{value}</div>
    </div>
  );
}
