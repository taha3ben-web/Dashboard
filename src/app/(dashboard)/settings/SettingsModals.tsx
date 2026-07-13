"use client";

import type { Dispatch, SetStateAction } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import type {
  City,
  CityForm,
  DeleteTarget,
  SettingForm,
  ZoneForm,
} from "./settings.types";

interface Props {
  settingForm: SettingForm;
  setSettingForm: Dispatch<SetStateAction<SettingForm>>;
  saveSetting: () => Promise<void>;
  cityForm: CityForm;
  setCityForm: Dispatch<SetStateAction<CityForm>>;
  saveCity: () => Promise<void>;
  zoneForm: ZoneForm;
  setZoneForm: Dispatch<SetStateAction<ZoneForm>>;
  cities: City[];
  saveZone: () => Promise<void>;
  deleteTarget: DeleteTarget | null;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
  deleteSelected: () => Promise<void>;
  busyAction: string;
}

export function SettingsModals(props: Props) {
  const {
    settingForm,
    setSettingForm,
    saveSetting,
    cityForm,
    setCityForm,
    saveCity,
    zoneForm,
    setZoneForm,
    cities,
    saveZone,
    deleteTarget,
    setDeleteTarget,
    deleteSelected,
    busyAction,
  } = props;

  return (
    <>
      <Modal
        open={settingForm.open}
        onClose={() => setSettingForm(emptySettingForm())}
        title={settingForm.originalKey ? "تعديل الإعداد" : "إضافة إعداد"}
        footer={
          <>
            <button
              onClick={() => setSettingForm(emptySettingForm())}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void saveSetting()}
              disabled={busyAction === "setting" || !settingForm.key.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "setting" ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            value={settingForm.key}
            onChange={(event) =>
              setSettingForm({ ...settingForm, key: event.target.value })
            }
            disabled={Boolean(settingForm.originalKey)}
            placeholder="المفتاح: app.general"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={settingForm.group}
            onChange={(event) =>
              setSettingForm({ ...settingForm, group: event.target.value })
            }
            placeholder="المجموعة"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <textarea
            value={settingForm.value}
            onChange={(event) =>
              setSettingForm({ ...settingForm, value: event.target.value })
            }
            rows={8}
            placeholder={
              settingForm.hasStoredSecret
                ? "القيمة محفوظة ومخفية. اتركها فارغة للإبقاء عليها، أو أدخل قيمة جديدة."
                : "قيمة JSON أو نص"
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settingForm.isPublic}
                onChange={(event) =>
                  setSettingForm({
                    ...settingForm,
                    isPublic: event.target.checked,
                    isSensitive: event.target.checked
                      ? false
                      : settingForm.isSensitive,
                  })
                }
              />
              متاح للتطبيقات
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settingForm.isSensitive}
                onChange={(event) =>
                  setSettingForm({
                    ...settingForm,
                    isSensitive: event.target.checked,
                    isPublic: event.target.checked
                      ? false
                      : settingForm.isPublic,
                  })
                }
              />
              قيمة حساسة ومخفية
            </label>
          </div>
          {settingForm.isSensitive ? (
            <p className="text-xs text-amber-600">
              القيم الحساسة لا تعاد من API الإدارة ولا من Public Config.
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={cityForm.open}
        onClose={() => setCityForm(emptyCityForm())}
        title={cityForm.id ? "تعديل المدينة" : "إنشاء مدينة"}
        footer={
          <>
            <button
              onClick={() => setCityForm(emptyCityForm())}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void saveCity()}
              disabled={busyAction === "city" || !cityForm.name.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "city" ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={cityForm.name}
            onChange={(event) =>
              setCityForm({ ...cityForm, name: event.target.value })
            }
            placeholder="اسم المدينة"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={cityForm.country}
            onChange={(event) =>
              setCityForm({
                ...cityForm,
                country: event.target.value.toUpperCase(),
              })
            }
            placeholder="رمز الدولة"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="number"
            min={-90}
            max={90}
            step="any"
            value={cityForm.centerLat}
            onChange={(event) =>
              setCityForm({ ...cityForm, centerLat: event.target.value })
            }
            placeholder="خط العرض"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="number"
            min={-180}
            max={180}
            step="any"
            value={cityForm.centerLng}
            onChange={(event) =>
              setCityForm({ ...cityForm, centerLng: event.target.value })
            }
            placeholder="خط الطول"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={cityForm.isActive}
              onChange={(event) =>
                setCityForm({ ...cityForm, isActive: event.target.checked })
              }
            />
            مدينة مفعلة
          </label>
        </div>
      </Modal>

      <Modal
        open={zoneForm.open}
        onClose={() => setZoneForm(emptyZoneForm())}
        title={zoneForm.id ? "تعديل المنطقة" : "إنشاء منطقة"}
        footer={
          <>
            <button
              onClick={() => setZoneForm(emptyZoneForm())}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void saveZone()}
              disabled={
                busyAction === "zone" ||
                !zoneForm.cityId ||
                !zoneForm.name.trim()
              }
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "zone" ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            value={zoneForm.cityId}
            onChange={(event) =>
              setZoneForm({ ...zoneForm, cityId: event.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">اختر المدينة</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <input
            value={zoneForm.name}
            onChange={(event) =>
              setZoneForm({ ...zoneForm, name: event.target.value })
            }
            placeholder="اسم المنطقة"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <textarea
            value={zoneForm.polygon}
            onChange={(event) =>
              setZoneForm({ ...zoneForm, polygon: event.target.value })
            }
            rows={8}
            placeholder='{"type":"Polygon","coordinates":[...]}'
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={
          deleteTarget
            ? `سيتم حذف ${deleteTarget.label}. لا يمكن التراجع عن العملية.`
            : ""
        }
        tone="danger"
        confirmLabel="حذف"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteSelected}
      />
    </>
  );
}

export function emptySettingForm(): SettingForm {
  return {
    open: false,
    originalKey: null,
    key: "",
    group: "",
    value: "",
    isPublic: false,
    isSensitive: false,
    hasStoredSecret: false,
  };
}
export function emptyCityForm(): CityForm {
  return {
    open: false,
    id: null,
    name: "",
    country: "DZ",
    centerLat: "",
    centerLng: "",
    isActive: true,
  };
}
export function emptyZoneForm(cityId = ""): ZoneForm {
  return {
    open: false,
    id: null,
    cityId,
    name: "",
    polygon: '{"type":"Polygon","coordinates":[]}',
  };
}
