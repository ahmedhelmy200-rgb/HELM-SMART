export type TemplateContext = Record<string, string | number | undefined | null>;

export function applyTemplate(content: string, ctx: TemplateContext): string {
  if (!content) return '';
  return content.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => {
    const v = ctx[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
