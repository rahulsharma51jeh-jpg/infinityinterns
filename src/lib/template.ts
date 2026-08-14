/**
 * TemplateConfig is the single source of truth for how a certificate looks.
 * The admin designer edits this JSON; the <Certificate/> renderer consumes it.
 * Nothing about the layout is hard-coded in the renderer.
 */

export type Align = 'left' | 'center' | 'right';
export type Weight = 'normal' | 'semibold' | 'bold';

/** A single line / paragraph in the certificate body. */
export interface Block {
  id: string;
  /** `text` = one line, `paragraph` = wrapped justified block, `spacer`/`divider` = layout only */
  type: 'text' | 'paragraph' | 'spacer' | 'divider';
  /** Supports {{placeholders}} and **bold** spans. */
  content: string;
  size: number; // px at design scale (1123px wide page)
  weight: Weight;
  align: Align;
  color: string;
  italic?: boolean;
  /** vertical space above this block, px */
  marginTop: number;
  lineHeight?: number;
  /** hide without deleting */
  hidden?: boolean;
  /** max width % of content area, for paragraphs */
  maxWidth?: number;
}

/** A data "column" that feeds the placeholders. Admin can add/remove/rename these. */
export interface FieldDef {
  /** placeholder key, e.g. `intern_name` -> {{intern_name}} */
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  /** where the value comes from: an application column, or manual entry */
  source: string; // application column name, or '' for manual/custom
  options?: string[];
  required: boolean;
  /** system fields can be hidden but not deleted */
  system?: boolean;
  defaultValue?: string;
}

export interface LogoSlot {
  id: string;
  /** data-URI or public path */
  url: string;
  label: string;
  /** rendered height in px */
  height: number;
  hidden?: boolean;
}

export interface TemplateConfig {
  page: {
    /** design-space width/height in px; A4 landscape @96dpi = 1123x794 */
    width: number;
    height: number;
    background: string;
    padding: number;
  };
  frame: {
    style: 'ornate-gold' | 'double-line' | 'minimal' | 'none';
    colorA: string; // light gold
    colorB: string; // deep gold
    colorAccent: string; // corner accents
    thickness: number;
    inset: number;
  };
  theme: {
    fontHeading: string;
    fontBody: string;
    fontSignature: string;
    ink: string; // default body colour
    accent: string; // highlight colour for bold values
  };
  title: {
    text: string;
    color: string;
    size: number;
    letterSpacing: number;
    subtitle: string;
    subtitleColor: string;
    subtitleSize: number;
    rules: boolean; // the horizontal rules either side of the subtitle
    ruleColor: string;
    /** combined width of subtitle + rules, as a % of the content area */
    ruleSpan: number;
    marginTop: number;
  };
  header: {
    leftLogo: LogoSlot;
    /** tagline under the left logo */
    leftTagline: string;
    leftTaglineSize: number;
    rightLogos: LogoSlot[];
  };
  body: {
    blocks: Block[];
  };
  qr: {
    enabled: boolean;
    position:
      | 'bottom-left'
      | 'bottom-right'
      | 'bottom-center'
      | 'top-left'
      | 'top-right'
      | 'above-verify-badge'
      | 'beside-verify-badge';
    size: number;
    caption: string;
    captionSize: number;
    /** dark module colour */
    color: string;
    showBorder: boolean;
  };
  certNo: {
    show: boolean;
    label: string;
    /** tokens: {SEQ} {YEAR} {MONTH} {RAND} plus any literal text */
    format: string;
    position: 'under-qr' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
    size: number;
    color: string;
    showIssueDate: boolean;
    issueDateLabel: string;
  };
  verifyBadge: {
    enabled: boolean;
    domain: string;
    email: string;
    heading: string;
    bg: string;
    fg: string;
    accent: string;
  };
  footerLogos: LogoSlot[];
  signature: {
    enabled: boolean;
    company: string;
    signatureText: string;
    /** optional uploaded signature image; overrides signatureText when set */
    signatureImage: string;
    signerTitle: string;
    color: string;
  };
  footerNote: {
    text: string;
    size: number;
    color: string;
  };
  watermark: {
    enabled: boolean;
    text: string;
    image: string;
    opacity: number;
    size: number;
    rotate: number;
  };
  /** which data columns exist */
  fields: FieldDef[];
}

/* ------------------------------------------------------------------ */
/* Placeholder catalogue                                               */
/* ------------------------------------------------------------------ */

export const SYSTEM_FIELDS: FieldDef[] = [
  { key: 'salutation', label: 'Salutation', type: 'select', source: 'salutation', options: ['Mr.', 'Ms.', 'Mrs.', 'Dr.'], required: true, system: true },
  { key: 'intern_name', label: 'Intern Name', type: 'text', source: 'full_name', required: true, system: true },
  { key: 'college', label: 'College / Institute', type: 'text', source: 'college', required: true, system: true },
  { key: 'course', label: 'Course / Branch', type: 'text', source: 'course', required: false, system: true },
  { key: 'duration', label: 'Duration', type: 'text', source: 'duration', required: true, system: true },
  { key: 'mode', label: 'Mode', type: 'select', source: 'mode', options: ['Online', 'Offline', 'Hybrid'], required: true, system: true },
  { key: 'domain', label: 'Domain / Technology', type: 'text', source: 'domain', required: true, system: true },
  { key: 'start_date', label: 'Start Date', type: 'date', source: 'start_date', required: true, system: true },
  { key: 'end_date', label: 'End Date', type: 'date', source: 'end_date', required: true, system: true },
  { key: 'attendance', label: 'Attendance %', type: 'number', source: 'attendance', required: true, system: true },
  { key: 'marks', label: 'Marks %', type: 'number', source: 'marks', required: true, system: true },
  { key: 'project_title', label: 'Project Title', type: 'text', source: 'project_title', required: false, system: true },
  { key: 'mentor_name', label: 'Mentor Name', type: 'text', source: 'mentor_name', required: false, system: true },
];

/** Placeholders that are always available, computed rather than stored. */
export const COMPUTED_PLACEHOLDERS = [
  { key: 'cert_no', label: 'Certificate number' },
  { key: 'issue_date', label: 'Issue date' },
  { key: 'pronoun_subject', label: 'he/she (from gender)' },
  { key: 'pronoun_object', label: 'him/her' },
  { key: 'pronoun_possessive', label: 'his/her' },
  { key: 'verify_url', label: 'Public verification URL' },
  { key: 'year', label: 'Issue year' },
];

/* ------------------------------------------------------------------ */
/* The default template — a faithful rebuild of the Infinity Interns   */
/* "Certificate of Completion" artwork.                                */
/* ------------------------------------------------------------------ */

export const DEFAULT_TEMPLATE: TemplateConfig = {
  page: { width: 1123, height: 794, background: '#ffffff', padding: 18 },
  frame: {
    style: 'ornate-gold',
    colorA: '#f6e3a8',
    colorB: '#c8a147',
    colorAccent: '#a8842f',
    thickness: 30,
    inset: 12,
  },
  theme: {
    fontHeading: 'var(--font-cert-serif), "Times New Roman", Georgia, serif',
    fontBody: 'var(--font-cert-sans), "Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    fontSignature: 'var(--font-cert-script), "Segoe Script", "Brush Script MT", cursive',
    ink: '#1b1b1b',
    accent: '#111111',
  },
  title: {
    text: 'CERTIFICATE',
    color: '#5b9bd5',
    size: 55,
    letterSpacing: 2,
    subtitle: 'OF COMPLETION',
    subtitleColor: '#1b1b1b',
    subtitleSize: 22,
    rules: true,
    ruleColor: '#1b1b1b',
    ruleSpan: 64,
    marginTop: 2,
  },
  header: {
    leftLogo: { id: 'left', url: '/logos/infinity-interns.svg', label: 'Infinity Interns', height: 78 },
    leftTagline: 'A unit of Infinity1 Career Counselling private Limited',
    leftTaglineSize: 8.5,
    rightLogos: [
      { id: 'mca', url: '/logos/mca.svg', label: 'Ministry of Corporate Affairs', height: 46 },
      { id: 'msme', url: '/logos/msme.svg', label: 'Ministry of MSME', height: 46 },
    ],
  },
  body: {
    blocks: [
      { id: 'b1', type: 'text', content: 'This is to certify that', size: 19, weight: 'normal', align: 'center', color: '#1b1b1b', marginTop: 12 },
      { id: 'b2', type: 'text', content: '{{salutation}} {{intern_name}}', size: 30, weight: 'bold', align: 'center', color: '#111111', marginTop: 6 },
      { id: 'b3', type: 'text', content: 'of', size: 18, weight: 'normal', align: 'center', color: '#1b1b1b', marginTop: 1 },
      { id: 'b4', type: 'text', content: '{{college}}', size: 24, weight: 'bold', align: 'center', color: '#111111', marginTop: 1 },
      { id: 'b5', type: 'text', content: 'has successfully completed a **{{duration}} {{mode}}** internship training in', size: 19, weight: 'normal', align: 'center', color: '#1b1b1b', marginTop: 6 },
      { id: 'b6', type: 'text', content: '{{domain}}', size: 25, weight: 'bold', align: 'center', color: '#111111', marginTop: 1 },
      { id: 'b7', type: 'text', content: 'from **{{start_date}}** to **{{end_date}}** .', size: 19, weight: 'normal', align: 'center', color: '#1b1b1b', marginTop: 1 },
      {
        id: 'b8',
        type: 'paragraph',
        content:
          'During this internship, {{pronoun_subject}} has learned key concepts in above mentioned domain with practical assignments and project. The student maintained **{{attendance}}%** attendance and secured **{{marks}}%** marks in the final assessment.',
        size: 17.5,
        weight: 'normal',
        align: 'center',
        color: '#1b1b1b',
        marginTop: 8,
        lineHeight: 1.42,
        maxWidth: 86,
      },
      {
        id: 'b9',
        type: 'text',
        content: 'We appreciate **{{pronoun_possessive}}** sincere participation and wish for their best for future opportunities.',
        size: 17.5,
        weight: 'normal',
        align: 'center',
        color: '#1b1b1b',
        marginTop: 6,
      },
    ],
  },
  qr: {
    enabled: true,
    position: 'bottom-left',
    size: 76,
    caption: 'Scan to verify',
    captionSize: 8.5,
    color: '#0f2547',
    showBorder: true,
  },
  certNo: {
    show: true,
    label: 'Certificate No:',
    format: 'IIN-{YEAR}-{SEQ}',
    position: 'under-qr',
    size: 10,
    color: '#333333',
    showIssueDate: true,
    issueDateLabel: 'Issued:',
  },
  verifyBadge: {
    enabled: true,
    domain: 'Infinityinterns.com',
    email: 'info@infinityinterns.com',
    heading: 'Verify at',
    bg: '#0f2547',
    fg: '#ffffff',
    accent: '#e23b3b',
  },
  footerLogos: [
    { id: 'aicte', url: '/logos/aicte.svg', label: 'AICTE', height: 54 },
    { id: 'nip', url: '/logos/nip.svg', label: 'National Internship Portal', height: 44 },
    { id: 'iso', url: '/logos/iso.svg', label: 'ISO 9001:2015', height: 54 },
  ],
  signature: {
    enabled: true,
    company: 'Infinity1 Career Counselling\nPrivate Limited',
    signatureText: 'Rahul Kumar',
    signatureImage: '',
    signerTitle: 'Director',
    color: '#12225a',
  },
  footerNote: {
    text: '(AICTE Approved and ISO Certified Platform)',
    size: 13,
    color: '#111111',
  },
  watermark: { enabled: false, text: 'INFINITY INTERNS', image: '', opacity: 0.06, size: 120, rotate: -20 },
  fields: SYSTEM_FIELDS,
};

/** Deep-merge a stored (possibly older / partial) config over the defaults. */
export function normalizeConfig(raw: unknown): TemplateConfig {
  const base = structuredClone(DEFAULT_TEMPLATE);
  if (!raw || typeof raw !== 'object') return base;
  return deepMerge(base, raw as Record<string, unknown>) as TemplateConfig;
}

function deepMerge<T>(target: T, src: Record<string, unknown>): T {
  const out = target as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v; // arrays are replaced wholesale (blocks, logos, fields)
    } else if (v && typeof v === 'object' && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as unknown as T;
}
