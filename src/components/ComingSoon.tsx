import { Topbar } from "./Topbar";
import { Construction } from "lucide-react";

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <Topbar title={title} />
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center text-gray-500">
        <Construction size={40} className="text-brand" />
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="max-w-md text-sm">
          {note ??
            "هذا القسم جزء من المراحل القادمة. واجهة اللوحة جاهزة وسيتم ربطها بنقطة الـ API المقابلة في الـ Backend."}
        </p>
      </div>
    </>
  );
}
