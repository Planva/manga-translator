'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
/* ▍第一段：外部 CDN 脚本 -------------------------------------------------- */
const SCRIPTS = {
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  pdfjs:     'https://cdn.jsdelivr.net/npm/pdfjs-dist@3/legacy/build/pdf.min.js',
  pdfjsWorker:
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3/legacy/build/pdf.worker.min.js',
  tesseractCore: (v: string) =>
    `https://cdn.jsdelivr.net/npm/tesseract.js-core@${v}/tesseract-core.wasm.js`,
};


import { Button } from '@/components/ui/button';
import { ArrowRight, CreditCard, Database } from 'lucide-react';
import { Terminal } from './terminal';
export default function ThumbnailTesterPage() {
  const [imgs,  setImgs]  = useState<string[]>([]);
  const [busy,  setBusy]  = useState(false);
  const worker = useRef<any>(null);

  /* ---------- 1) 初始化 Tesseract ---------- */
  useEffect(() => {
    (async () => {
      // @ts-ignore - window 对象在浏览器端
      const { Tesseract } = window as any;
      if (!Tesseract) return;
      worker.current = await Tesseract.createWorker('eng', 1, {
        corePath: SCRIPTS.tesseractCore('5'),
      });
    })();
  }, []);

  /* ---------- 2) 处理上传 ---------- */
  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const outs: string[] = [];

    // 只有第一次点上传才动态等待 pdf.js 脚本 ready
    // @ts-ignore
    const pdfjsLib = (window as any).pdfjsLib!;
    pdfjsLib.GlobalWorkerOptions.workerSrc = SCRIPTS.pdfjsWorker;

    for (const f of files) {
      /* 2.1 把 PDF 的第 1 页或图片本身转成 DataURL */
      const dataURL =
        f.type === 'application/pdf'
          ? await pdfToPng(f, pdfjsLib.getDocument)
          : URL.createObjectURL(f);

      /* 2.2 OCR 叠字 */
      setBusy(true);
      outs.push(await overlayOCR(dataURL));
      setBusy(false);
    }
    setImgs(outs);
  }

  /* ---------- 3) PDF → PNG ---------- */
  async function pdfToPng(
    file: File,
    getDocument: (src: ArrayBuffer) => any,
  ): Promise<string> {
    const pdf   = await getDocument(await file.arrayBuffer()).promise;
    const page  = await pdf.getPage(1);
    const view  = page.getViewport({ scale: 1.5 });
    const cvs   = document.createElement('canvas');
    cvs.width   = view.width;
    cvs.height  = view.height;
    await page.render({ canvasContext: cvs.getContext('2d')!, viewport: view })
      .promise;
    return cvs.toDataURL();
  }

  /* ---------- 4) OCR 叠字 ---------- */
  async function overlayOCR(src: string): Promise<string> {
    if (!worker.current) return src;               // worker 未就绪
    const img  = await loadImage(src);
    const cvs  = document.createElement('canvas');
    cvs.width  = img.naturalWidth;
    cvs.height = img.naturalHeight;
    const ctx  = cvs.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const { data } = await worker.current.recognize(img);
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'top';

    data.words.forEach((w: any) => {
      const { x0, y0, x1 } = w.bbox;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x0, y0 - 20, x1 - x0, 24);
      ctx.fillStyle = 'black';
      ctx.fillText(w.text, x0, y0);
    });

    return cvs.toDataURL();
  }

  /* ---------- 5) 辅助：加载 <img> ---------- */
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src    = src;
    });
  }

  /* ---------- 6) 页面渲染 ---------- */
  return (
    <>
      {/* PDF.js & Tesseract 脚本：只在客户端加载 */}
      <Script src={SCRIPTS.pdfjs}     strategy="beforeInteractive" />
      <Script src={SCRIPTS.tesseract} strategy="beforeInteractive" />

      <main className="flex flex-col items-center gap-4 p-10">
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFiles}
          className="file:mr-4 file:rounded file:bg-blue-600 file:px-3 file:py-1.5 file:text-white"
        />
        {busy && <p className="text-sm text-gray-500">OCR running…</p>}
        <div className="grid grid-cols-2 gap-4">
          {imgs.map((src) => (
            <img key={src} src={src} className="w-64 border rounded" />
          ))}
        </div>
      </main>
    </>
  );
}

