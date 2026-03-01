import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

const RESET_KEYS = [
  'legalmaster_config',
  'legalmaster_clients',
  'legalmaster_cases',
  'legalmaster_invoices',
  'legalmaster_expenses',
  'legalmaster_logs',
  'legalmaster_reminders',
  // cloud config (optional)
  'helm_cloud_url',
  'helm_cloud_anon',
  'helm_cloud_table',
  'helm_cloud_auto_sync',
  'helm_cloud_last_sync',
];

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error('UI crash caught by ErrorBoundary:', error);
  }

  private resetStorage = () => {
    if (!confirm('سيتم حذف بيانات التخزين المحلي (قد تفقد البيانات غير المرفوعة للسحابة). هل تود الاستمرار؟')) return;
    try {
      for (const k of RESET_KEYS) localStorage.removeItem(k);
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900/60 border border-slate-700 rounded-2xl p-6">
          <h1 className="text-2xl font-black mb-2">حدث خطأ أدى لتوقف الواجهة</h1>
          <p className="text-sm opacity-80 mb-4">
            السبب غالبًا بيانات غير متوافقة/ناقصة أو مشكلة في التخزين المحلي. الرسالة:
          </p>
          <pre className="text-xs bg-black/40 p-3 rounded-xl overflow-auto mb-4">{this.state.message}</pre>

          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-xl bg-white text-black font-black" onClick={() => window.location.reload()}>
              إعادة تحميل
            </button>
            <button className="px-4 py-2 rounded-xl bg-red-600 text-white font-black" onClick={this.resetStorage}>
              حذف بيانات التخزين المحلي (Reset)
            </button>
          </div>

          <p className="text-xs opacity-70 mt-4">
            ملاحظة: إذا كانت السحابة مفعلة، ارفع البيانات أولاً عند العودة، أو استخدم الاستعادة من السحابة بعد Reset.
          </p>
        </div>
      </div>
    );
  }
}
