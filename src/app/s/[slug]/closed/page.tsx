import Link from "next/link";

type ClosedPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClosedPage({ params }: ClosedPageProps) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-xl rounded-[36px] border border-neutral-200 bg-neutral-50 p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Session Closed
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          场次已结束
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          当前问卷收集已经关闭，新的匿名答卷不再接收。若你是通过旧二维码或旧链接进入，请联系现场讲师确认是否已开启新的场次。
        </p>
        <Link
          className="mt-8 inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
          href={`/s/${slug}`}
        >
          返回填写入口
        </Link>
      </div>
    </main>
  );
}
