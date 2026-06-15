"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { buildQrDownloadFileName } from "@/features/exports/filenames";
import { buildShareQrDataUrl } from "@/features/sessions/qr";

type ShareDialogProps = {
  sessionName: string;
  url: string;
};

export function ShareDialog({ sessionName, url }: ShareDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制链接");
  const qrDownloadFileName = buildQrDownloadFileName(sessionName);

  useEffect(() => {
    let active = true;

    buildShareQrDataUrl(url)
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrDataUrl("");
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制链接"), 1500);
    } catch {
      setCopyLabel("复制失败");
      window.setTimeout(() => setCopyLabel("复制链接"), 1500);
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
          type="button"
        >
          投屏填写
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-white p-8 shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-neutral-950">
                {sessionName}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-neutral-600">
                使用公网填写域名生成二维码，适合投屏扫码或直接分享链接。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="关闭分享弹窗"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-lg text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                type="button"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex min-h-80 items-center justify-center rounded-[28px] bg-neutral-50 p-5">
              {qrDataUrl ? (
                <Image
                  alt={`${sessionName} 分享二维码`}
                  className="h-72 w-72 rounded-3xl"
                  height={320}
                  src={qrDataUrl}
                  unoptimized
                  width={320}
                />
              ) : (
                <div className="text-sm text-neutral-500">二维码生成中...</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Public Survey URL
                </p>
                <a
                  className="mt-3 block break-all text-sm leading-6 text-emerald-700 hover:text-emerald-800"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {url}
                </a>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                  onClick={handleCopy}
                  type="button"
                >
                  {copyLabel}
                </button>
                <a
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  打开填写页
                </a>
                {qrDataUrl ? (
                  <a
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                    download={qrDownloadFileName}
                    href={qrDataUrl}
                  >
                    下载二维码图片
                  </a>
                ) : null}
              </div>

              <p className="text-sm leading-6 text-neutral-600">
                当前二维码始终指向员工可访问的公网填写域名，不使用讲师后台域名。
              </p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
