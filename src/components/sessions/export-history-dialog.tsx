"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";

type ExportJob = {
  id: string;
  kind: "RAW_XLSX" | "SUMMARY_XLSX" | "PDF";
  status: "PENDING" | "READY" | "FAILED";
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExportHistoryDialogProps = {
  sessionId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getKindLabel(kind: ExportJob["kind"]) {
  if (kind === "RAW_XLSX") {
    return "导出原始明细";
  }
  if (kind === "SUMMARY_XLSX") {
    return "导出统计汇总";
  }
  return "导出 PDF 报告";
}

function getKindHref(sessionId: string, kind: ExportJob["kind"]) {
  if (kind === "RAW_XLSX") {
    return `/api/sessions/${sessionId}/exports/raw`;
  }
  if (kind === "SUMMARY_XLSX") {
    return `/api/sessions/${sessionId}/exports/summary`;
  }
  return `/api/sessions/${sessionId}/exports/pdf`;
}

function getStatusLabel(status: ExportJob["status"]) {
  if (status === "READY") {
    return "已完成";
  }
  if (status === "FAILED") {
    return "失败";
  }
  return "生成中";
}

export function ExportHistoryDialog({ sessionId }: ExportHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = useMemo(() => `/api/sessions/${sessionId}/exports`, [sessionId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('FETCH_FAILED');
        }
        const payload = (await response.json()) as { jobs: ExportJob[] };
        if (active) {
          setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
        }
      } catch (e) {
        if (active) {
          setJobs([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [apiUrl, open]);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
          type="button"
        >
          导出历史
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-white p-8 shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-neutral-950">
                导出历史
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-neutral-600">
                展示本场次的导出记录，并支持快速重新导出。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="关闭导出历史弹窗"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-lg text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                type="button"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-8 space-y-3">
            {loading ? (
              <div className="rounded-[28px] bg-neutral-50 px-5 py-6 text-sm text-neutral-600">
                加载中...
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-[28px] bg-neutral-50 px-5 py-6 text-sm text-neutral-600">
                暂无导出记录
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  className="flex flex-col gap-4 rounded-[28px] border border-neutral-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between"
                  data-testid="export-history-item"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-950">
                      {getKindLabel(job.kind)}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {getStatusLabel(job.status)} · {formatDate(job.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-5 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
                      href={job.fileUrl ?? getKindHref(sessionId, job.kind)}
                    >
                      重新导出
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

