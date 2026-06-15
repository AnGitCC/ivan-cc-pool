"use client";

import { useSyncExternalStore } from "react";

type DeleteSessionButtonProps = {
  confirmMessage?: string;
};

const defaultConfirmMessage =
  "删除后，该场次的答卷、统计与导出记录将一并清除，且不可恢复。";
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function DeleteSessionButton({
  confirmMessage = defaultConfirmMessage,
}: DeleteSessionButtonProps) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!isHydrated}
      onClick={(event) => {
        if (!isHydrated) {
          return;
        }

        const form = event.currentTarget.form;

        if (!form) {
          return;
        }

        if (window.confirm(confirmMessage)) {
          form.requestSubmit();
        }
      }}
      type="button"
    >
      删除场次
    </button>
  );
}
