import { CaseDocument } from '../types';

// مجموعة نماذج قانونية مختصرة قابلة للتعديل.
// تستخدم نفس محرك الاستبدال: {officeName} {clientName} {caseNumber} {caseTitle} {date} ...

const iso = () => new Date().toLocaleDateString('en-GB');

export const DEFAULT_OFFICE_TEMPLATES: CaseDocument[] = [
  {
    id: 'tpl_fee_agreement',
    name: 'اتفاقية أتعاب مع الموكل (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'نموذج اتفاقية أتعاب مختصر قابل للتعديل.',
    content: `بسم الله الرحمن الرحيم\n\nاتفاقية أتعاب\n\nفي يوم {date} تم الاتفاق بين:\n1) {officeName} ("المكتب")\n2) السيد/السيدة: {clientName} ("الموكل")\n\nموضوع الاتفاق: تمثيل الموكل في القضية رقم {caseNumber} بعنوان "{caseTitle}".\n\nالأتعاب: اتفق الطرفان على أتعاب قدرها (______) درهم إماراتي، تُسدّد كالتالي: (______).\n\nنطاق العمل: إعداد ومراجعة المستندات والمرافعات وحضور الجلسات والمتابعة وفق متطلبات القضية.\n\nأحكام عامة:\n- يلتزم الموكل بتزويد المكتب بالمستندات الصحيحة وفي المواعيد اللازمة.\n- هذه الاتفاقية قابلة للتعديل كتابةً باتفاق الطرفين.\n\nتوقيع المكتب: ____________    توقيع الموكل: ____________\n` ,
  },
  {
    id: 'tpl_debt_ack',
    name: 'إقرار مديونية (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'إقرار مديونية مختصر.',
    content: `إقرار مديونية\n\nأنا الموقع أدناه: {clientName} أقرّ بأنني مدين لـ (______) بمبلغ قدره (______) درهم إماراتي، وذلك عن (______).\n\nأتعهد بسداد المبلغ بتاريخ: (______)، وفي حال التخلف يحق للدائن اتخاذ الإجراءات القانونية.\n\nحرر بتاريخ: {date}\n\nالاسم: {clientName}\nالتوقيع: ____________\nرقم الهوية/الإقامة: (______)\n` ,
  },
  {
    id: 'tpl_undertaking',
    name: 'تعهد (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'تعهد عام مختصر.',
    content: `تعهد\n\nأتعهد أنا/ {clientName} بما يلي:\n1) (______)\n2) (______)\n\nوأقر بأن هذا التعهد صادر عن إرادة حرة، وأتحمل كامل المسؤولية القانونية حال الإخلال به.\n\nحرر بتاريخ: {date}\n\nالاسم: {clientName}\nالتوقيع: ____________\n` ,
  },
  {
    id: 'tpl_notice',
    name: 'إنذار/إشعار قانوني (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'إشعار/إنذار مختصر قبل اتخاذ إجراء قانوني.',
    content: `إنذار قانوني\n\nالسيد/السادة: (______)\n\nبالإشارة إلى: (______)\nنحيطكم علماً بضرورة (______) خلال مدة (______) من تاريخ استلام هذا الإشعار، وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة دون أدنى مسؤولية على {officeName}.\n\nتحريراً في: {date}\n\n{officeName}\nالتوقيع: ____________\n` ,
  },
  {
    id: 'tpl_ad',
    name: 'نموذج إعلان (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'إعلان مختصر قابل للتخصيص.',
    content: `إعلان\n\nيعلن {officeName} عن (______)\nوذلك بخصوص: (______)\n\nللإفادة/الاعتراض خلال: (______)\n\nصدر بتاريخ: {date}\n` ,
  },
  {
    id: 'tpl_power_of_attorney_note',
    name: 'إفادة/طلب توكيل (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'صيغة طلب/إفادة مرتبطة بالتوكيل.',
    content: `طلب\n\nأرجو التكرم بإنجاز (______) لصالح الموكل/ {clientName}.\n\nبيانات القضية (إن وجدت): رقم {caseNumber} - {caseTitle}.\n\nوتفضلوا بقبول فائق الاحترام.\n\n{officeName}\nالتاريخ: {date}\nالتوقيع: ____________\n` ,
  },
  {
    id: 'tpl_settlement',
    name: 'مخالصة/تسوية (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'مخالصة مختصرة قابلة للتعديل.',
    content: `مخالصة\n\nأقر أنا/ (______) بأنني استلمت من {clientName} مبلغاً وقدره (______) درهم إماراتي، وذلك تسويةً لـ (______).\n\nوبذلك تبرأ ذمة الطرفين من أي مطالبات متعلقة بما ورد أعلاه.\n\nحرر بتاريخ: {date}\n\nالاسم: ____________\nالتوقيع: ____________\n` ,
  },
  {
    id: 'tpl_meeting_minutes',
    name: 'محضر اجتماع/جلسة (مختصر)',
    type: 'Template',
    uploadDate: iso(),
    status: 'Draft',
    description: 'محضر مختصر.',
    content: `محضر\n\nالتاريخ: {date}\nالحضور: (______)\n\nالموضوع: {caseTitle} (رقم {caseNumber})\n\nالوقائع/الملاحظات:\n- (______)\n- (______)\n\nالإجراءات المتفق عليها:\n1) (______)\n2) (______)\n\nالتوقيع: ____________\n` ,
  },
];
