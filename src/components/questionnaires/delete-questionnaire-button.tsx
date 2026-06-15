"use client";

import { useSyncExternalStore } from "react";

type DeleteQuestionnaireButtonProps = {
  confirmMessage?: string;
};

const defaultConfirmMessage = "确认删除这份空问卷吗？删除后不可恢复。";
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function DeleteQuestionnaireButton({
  confirmMessage = defaultConfirmMessage,
}: DeleteQuestionnaireButtonProps) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      删除空问卷
    </button>
  );
}
