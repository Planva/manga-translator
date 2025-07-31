'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

const CDN = {
  core: (v: string) =>
    `https://cdn.jsdelivr.net/npm/tesseract.js-core@${v}/tesseract-core.wasm.js`,
  js:  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
};

export default function Home() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy]         = useState(false);
  const workerRef = useRef<any>(null);

  /** 初始化 Tesseract（只做一次） */
  useEffect(() => {
    async function init() {
      // @ts-ignore - 加载完 script 后 window.Tesseract 才存在
      const { Tesseract } = window as any;
      const w = await Tesseract.createWorker('eng', 1, {
        corePath: CDN.core('5'),
      });
      workerRef.current = w;
    }
    if (typeof window !== 'undefined') init();
  }, []);

  /** 选择文件后生成缩略图 + OCR */
  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const outs: string[] = [];

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3/legacy/build/pdf.worker.min.js';

    for (const f of files) {
      // 1. 把文件绘制到 <canvas>
      const imgURL =
        f.type === 'application/pdf'
          ? await pdf2png(f, pdfjs)
          : URL.createObjectURL(f);

      // 2. OCR 并把文字画上去
      const finalURL = await ocrOverlay(imgURL);
      outs.push(finalURL);
    }
    setPreviews(outs);
  }

  /** PDF → PNG DataURL（取第 1 页） */
  async function pdf2png(file: File, getDocumentFn: any) {
    const pdf = await getDocumentFn(await file.arrayBuffer()).promise;
    const page = await pdf.getPage(1);
    const vp   = page.getViewport({ scale: 1.5 });
    const cvs  = document.createElement('canvas');
    cvs.width  = vp.width;
    cvs.height = vp.height;
    await page.render({ canvasContext: cvs.getContext('2d')!, viewport: vp })
      .promise;
    return cvs.toDataURL();
  }

  /** OCR 并把文字盖到图片上，返回带字的 DataURL */
  async function ocrOverlay(imgSrc: string) {
    setBusy(true);
    const img = await loadImage(imgSrc);
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d')!;
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const worker = workerRef.current;
    const { data } = await worker.recognize(img);
    ctx.font = '20px sans-serif';

    data.words.forEach(w => {
      const { x0, y0, x1, y1 } = w.bbox; // 识别到的矩形
      // 盖白底
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x0, y0 - 20, x1 - x0, 24);
      // 写文字
      ctx.fillStyle = 'black';
      ctx.fillText(w.text, x0, y0);
    });
    setBusy(false);
    return cvs.toDataURL();
  }

  return (
    <>
      {/* 1. 先把 Tesseract 脚本塞进 head，等其 onLoad 再执行 */}
      <Script src={CDN.js} strategy="beforeInteractive" />

      {/* 2. UI */}
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
          {previews.map(src => (
            <img key={src} src={src} className="w-64 border rounded" />
          ))}
        </div>
      </main>
    </>
  );
}

/** 工具函数：加载 <img> 并返回元素 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = src;
  });
}
