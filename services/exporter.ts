// Export helpers (no external deps)

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTable(title: string, headers: string[], rows: any[][]) {
  const thead = `<tr>${headers
    .map(
      (h) =>
        `<th style="border:1px solid #ddd;padding:6px;background:#f3f4f6;font-weight:700">${esc(h)}</th>`
    )
    .join('')}</tr>`;
  const tbody = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c) =>
              `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${esc(
                c
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');
  return `
    <h3 style="margin:18px 0 8px;font-size:16px">${esc(title)}</h3>
    <table style="border-collapse:collapse;width:100%;font-size:12px" dir="rtl">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

export function exportExcelXls(
  filename: string,
  sections: { title: string; headers: string[]; rows: any[][] }[]
) {
  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]><xml>
        <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Data</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
      </xml><![endif]-->
    </head>
    <body>
      <div style="font-family:Arial;direction:rtl">
        <h2 style="margin:0 0 12px">تصدير البيانات</h2>
        <div style="color:#6b7280;font-size:12px">تم إنشاء الملف: ${esc(
          new Date().toLocaleString('en-GB')
        )}</div>
        ${sections.map((s) => toTable(s.title, s.headers, s.rows)).join('')}
      </div>
    </body>
  </html>`;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function exportPdfViaPrint(title: string, htmlBody: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w)
    return alert(
      'تعذر فتح نافذة التصدير. تأكد من السماح بالنوافذ المنبثقة.'
    );

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${esc(title)}</title>
        <style>
          body{font-family:Arial;direction:rtl;margin:24px;color:#111}
          h1{margin:0 0 8px;font-size:20px}
          .muted{color:#6b7280;font-size:12px;margin-bottom:16px}
          table{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0 18px}
          th,td{border:1px solid #ddd;padding:6px;vertical-align:top;white-space:pre-wrap}
          th{background:#f3f4f6;font-weight:700}
          @media print{body{margin:0} .no-print{display:none}}
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:12px">
          <button onclick="window.print()" style="padding:10px 14px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:700;cursor:pointer">طباعة / حفظ PDF</button>
        </div>
        ${htmlBody}
      </body>
    </html>
  `);
  w.document.close();
  try {
    w.focus();
  } catch {}
}

// Professional print layout with letterhead + optional stamp watermark.
// Does not break previous exports; callers can opt-in.
export function exportPdfViaPrintWithLetterhead(
  title: string,
  htmlBody: string,
  config?: {
    officeName?: string;
    officeSlogan?: string;
    officePhone?: string;
    officeEmail?: string;
    officeAddress?: string;
    officeWebsite?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    stamp?: string | null;
    fontFamily?: string;
  }
) {
  const primary = config?.primaryColor || '#0f172a';
  const secondary = config?.secondaryColor || '#d4af37';
  const fontFamily = config?.fontFamily || 'Cairo, Arial';
  const officeName = config?.officeName || 'المكتب';
  const officeSlogan = config?.officeSlogan || '';

  const contactLine = [
    config?.officePhone ? `هاتف: ${esc(config.officePhone)}` : '',
    config?.officeEmail ? `بريد: ${esc(config.officeEmail)}` : '',
    config?.officeWebsite ? `موقع: ${esc(config.officeWebsite)}` : '',
    config?.officeAddress ? `العنوان: ${esc(config.officeAddress)}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const logoHtml = config?.logo
    ? `<img src="${esc(config.logo)}" style="width:56px;height:56px;object-fit:contain" />`
    : `<div style="width:56px;height:56px;border-radius:14px;background:${esc(primary)};display:flex;align-items:center;justify-content:center;color:white;font-weight:900">H</div>`;

  const stampCss =
    config?.stamp
      ? `body:before{content:'';position:fixed;inset:0;pointer-events:none;background:url('${esc(
          config.stamp
        )}') center 40%/420px no-repeat;opacity:0.06;filter:grayscale(100%);}`
      : '';

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w)
    return alert('تعذر فتح نافذة التصدير. تأكد من السماح بالنوافذ المنبثقة.');

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${esc(title)}</title>
        <style>
          :root{--primary:${esc(primary)};--secondary:${esc(secondary)};}
          ${stampCss}
          body{font-family:${esc(fontFamily)};direction:rtl;margin:22px;color:#0b1220;background:#fff}
          .no-print{margin-bottom:12px}
          .btn{padding:10px 14px;border:0;border-radius:12px;background:var(--primary);color:#fff;font-weight:800;cursor:pointer}
          .sheet{max-width:980px;margin:0 auto}
          .letterhead{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:2px solid var(--secondary);padding-bottom:10px;margin-bottom:14px}
          .lh-right{display:flex;align-items:center;gap:12px}
          .lh-title{line-height:1.25}
          .lh-title h1{margin:0;font-size:18px;font-weight:900;color:var(--primary)}
          .lh-title .slogan{margin-top:4px;font-size:12px;color:#334155;font-weight:700}
          .lh-meta{font-size:11px;color:#475569;text-align:left;direction:ltr;max-width:46%}
          .doc-title{margin:10px 0 2px;font-size:16px;font-weight:900}
          .muted{color:#64748b;font-size:12px;margin-bottom:12px}
          table{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0 18px}
          th,td{border:1px solid #e5e7eb;padding:7px;vertical-align:top;white-space:pre-wrap}
          th{background:#f8fafc;font-weight:900}
          .hr{height:1px;background:#e5e7eb;margin:12px 0}
          .footer{margin-top:16px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:#475569}
          @page{margin:14mm}
          @media print{.no-print{display:none} body{margin:0} .sheet{max-width:none}}
        </style>
      </head>
      <body>
        <div class="no-print"><button class="btn" onclick="window.print()">طباعة / حفظ PDF</button></div>
        <div class="sheet">
          <div class="letterhead">
            <div class="lh-right">
              ${logoHtml}
              <div class="lh-title">
                <h1>${esc(officeName)}</h1>
                ${officeSlogan ? `<div class="slogan">${esc(officeSlogan)}</div>` : ''}
              </div>
            </div>
            <div class="lh-meta">
              ${contactLine ? `<div>${contactLine}</div>` : ''}
              <div style="margin-top:4px">${esc(new Date().toLocaleString('en-GB'))}</div>
            </div>
          </div>
          <div class="doc-title">${esc(title)}</div>
          <div class="muted">تم إنشاء المستند عبر برنامج حلم الذكي</div>
          ${htmlBody}
          <div class="footer">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>© ${esc(officeName)}</div>
              <div>${contactLine || ''}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  w.document.close();
  try {
    w.focus();
  } catch {}
}
