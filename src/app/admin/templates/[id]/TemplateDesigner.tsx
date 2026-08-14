'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import type { Block, FieldDef, LogoSlot, TemplateConfig } from '@/lib/template';
import { COMPUTED_PLACEHOLDERS } from '@/lib/template';
import type { CertData } from '@/lib/render';
import CertificateArtwork from '@/components/certificate/CertificateArtwork';
import CertificateStage from '@/components/certificate/CertificateStage';
import Flash from '@/components/ui/Flash';
import { ChevronLeftIcon } from '@/components/ui/Icons';
import { saveTemplate, type ActionState } from '../../actions';
import { Area, Color, ImagePick, MiniBtn, Num, Pick, Row, Section, Text, Toggle } from './controls';

const PAGE_PRESETS = [
  { value: 'a4l', label: 'A4 landscape (1123 × 794)', w: 1123, h: 794 },
  { value: 'a4p', label: 'A4 portrait (794 × 1123)', w: 794, h: 1123 },
  { value: 'letterl', label: 'US Letter landscape (1056 × 816)', w: 1056, h: 816 },
] as const;

export default function TemplateDesigner({
  templateId,
  initialName,
  initialConfig,
  isDefault,
  usageCount,
  previewData,
  verifyUrl,
}: {
  templateId: number;
  initialName: string;
  initialConfig: TemplateConfig;
  isDefault: boolean;
  usageCount: number;
  previewData: CertData;
  verifyUrl: string;
}) {
  const [name, setName] = useState(initialName);
  const [cfg, setCfg] = useState<TemplateConfig>(initialConfig);
  const [qr, setQr] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(saveTemplate, {});

  /** Patch a top-level section of the config. */
  function patch<K extends keyof TemplateConfig>(key: K, value: Partial<TemplateConfig[K]>) {
    setDirty(true);
    setCfg((c) => ({ ...c, [key]: { ...(c[key] as object), ...value } as TemplateConfig[K] }));
  }
  function replace<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    setDirty(true);
    setCfg((c) => ({ ...c, [key]: value }));
  }

  // Regenerate the preview QR whenever its colour changes so the preview is honest.
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: cfg.qr.color, light: '#ffffff' },
    })
      .then((url) => alive && setQr(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [cfg.qr.color, verifyUrl]);

  // Placeholders available to body copy, derived from the configured columns.
  const placeholders = useMemo(
    () => [
      ...cfg.fields.map((f) => ({ key: f.key, label: f.label })),
      ...COMPUTED_PLACEHOLDERS,
    ],
    [cfg.fields],
  );

  const data = useMemo(() => {
    // Fill any newly added custom column with a visible stand-in.
    const d: CertData = { ...previewData };
    for (const f of cfg.fields) if (d[f.key] === undefined) d[f.key] = f.defaultValue || `[${f.label}]`;
    return d;
  }, [cfg.fields, previewData]);

  /* ---------------------------- block helpers ---------------------------- */

  function setBlock(id: string, value: Partial<Block>) {
    setDirty(true);
    setCfg((c) => ({
      ...c,
      body: { blocks: c.body.blocks.map((b) => (b.id === id ? { ...b, ...value } : b)) },
    }));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setDirty(true);
    setCfg((c) => {
      const blocks = [...c.body.blocks];
      const i = blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= blocks.length) return c;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...c, body: { blocks } };
    });
  }
  function addBlock() {
    setDirty(true);
    setCfg((c) => ({
      ...c,
      body: {
        blocks: [
          ...c.body.blocks,
          {
            id: `b${Date.now().toString(36)}`,
            type: 'text',
            content: 'New line — use {{intern_name}} and **bold**',
            size: 18,
            weight: 'normal',
            align: 'center',
            color: cfg.theme.ink,
            marginTop: 6,
          },
        ],
      },
    }));
  }
  function removeBlock(id: string) {
    setDirty(true);
    setCfg((c) => ({ ...c, body: { blocks: c.body.blocks.filter((b) => b.id !== id) } }));
  }

  /* ---------------------------- logo helpers ----------------------------- */

  function setLogoList(key: 'rightLogos' | 'footerLogos', list: LogoSlot[]) {
    setDirty(true);
    if (key === 'rightLogos') setCfg((c) => ({ ...c, header: { ...c.header, rightLogos: list } }));
    else setCfg((c) => ({ ...c, footerLogos: list }));
  }

  function LogoList({ which }: { which: 'rightLogos' | 'footerLogos' }) {
    const list = which === 'rightLogos' ? cfg.header.rightLogos : cfg.footerLogos;
    const update = (i: number, v: Partial<LogoSlot>) =>
      setLogoList(which, list.map((l, k) => (k === i ? { ...l, ...v } : l)));

    return (
      <div className="space-y-3">
        {list.map((l, i) => (
          <div key={l.id} className="rounded-lg border border-navy-100 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex-1 truncate text-xs font-semibold text-navy-700">{l.label || 'Untitled logo'}</span>
              <MiniBtn onClick={() => setLogoList(which, list.filter((_, k) => k !== i))} danger title="Remove">
                ✕
              </MiniBtn>
              <MiniBtn onClick={() => moveLogo(which, i, -1)} disabled={i === 0} title="Move up">
                ↑
              </MiniBtn>
              <MiniBtn onClick={() => moveLogo(which, i, 1)} disabled={i === list.length - 1} title="Move down">
                ↓
              </MiniBtn>
            </div>
            <ImagePick label="Image" value={l.url} onChange={(v) => update(i, { url: v })} />
            <Row>
              <Text label="Label (alt text)" value={l.label} onChange={(v) => update(i, { label: v })} />
              <Num label="Height" suffix="px" value={l.height} min={10} max={200} onChange={(v) => update(i, { height: v })} />
            </Row>
            <div className="mt-2">
              <Toggle label="Hidden" checked={Boolean(l.hidden)} onChange={(v) => update(i, { hidden: v })} />
            </div>
          </div>
        ))}

        <MiniBtn
          onClick={() =>
            setLogoList(which, [
              ...list,
              { id: `l${Date.now().toString(36)}`, url: '', label: 'New logo', height: 48 },
            ])
          }
        >
          + Add logo
        </MiniBtn>
      </div>
    );
  }

  function moveLogo(which: 'rightLogos' | 'footerLogos', i: number, dir: -1 | 1) {
    const list = which === 'rightLogos' ? [...cfg.header.rightLogos] : [...cfg.footerLogos];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setLogoList(which, list);
  }

  /* ---------------------------- field helpers ---------------------------- */

  function setFields(list: FieldDef[]) {
    setDirty(true);
    replace('fields', list);
  }

  const pagePreset =
    PAGE_PRESETS.find((p) => p.w === cfg.page.width && p.h === cfg.page.height)?.value ?? 'a4l';

  return (
    <div>
      {/* -------------------------- sticky toolbar -------------------------- */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-navy-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/templates" className="btn-ghost btn-sm">
            <ChevronLeftIcon />
            Templates
          </Link>

          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="input max-w-sm flex-1 font-semibold"
            aria-label="Template name"
          />

          {isDefault && <span className="badge bg-emerald-100 text-emerald-800">Default</span>}
          {usageCount > 0 && <span className="badge bg-navy-100 text-navy-600">{usageCount} issued</span>}
          {dirty && <span className="badge bg-amber-100 text-amber-800">Unsaved changes</span>}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Discard all unsaved changes and reload the last saved version?')) {
                  setCfg(initialConfig);
                  setName(initialName);
                  setDirty(false);
                }
              }}
              className="btn-ghost btn-sm"
            >
              Reset
            </button>

            <form
              action={action}
              onSubmit={() => setDirty(false)}
            >
              <input type="hidden" name="id" value={templateId} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="config" value={JSON.stringify(cfg)} />
              <button type="submit" className="btn-primary btn-sm">
                Save template
              </button>
            </form>
          </div>
        </div>

        {(state.ok || state.error) && (
          <div className="mt-3">
            <Flash ok={state.ok} error={state.error} />
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[26rem_1fr]">
        {/* ----------------------------- editor ---------------------------- */}
        <div className="card h-fit xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <Section title="Page size & background" defaultOpen>
            <Pick
              label="Preset"
              value={pagePreset}
              onChange={(v) => {
                const p = PAGE_PRESETS.find((x) => x.value === v)!;
                patch('page', { width: p.w, height: p.h });
              }}
              options={PAGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
            />
            <Row>
              <Num label="Width" suffix="px" value={cfg.page.width} min={400} max={2400} onChange={(v) => patch('page', { width: v })} />
              <Num label="Height" suffix="px" value={cfg.page.height} min={400} max={2400} onChange={(v) => patch('page', { height: v })} />
            </Row>
            <Row>
              <Color label="Background" value={cfg.page.background} onChange={(v) => patch('page', { background: v })} />
              <Num label="Inner padding" suffix="px" value={cfg.page.padding} min={0} max={120} onChange={(v) => patch('page', { padding: v })} />
            </Row>
          </Section>

          <Section title="Border / frame">
            <Pick
              label="Style"
              value={cfg.frame.style}
              onChange={(v) => patch('frame', { style: v })}
              options={[
                { value: 'ornate-gold', label: 'Ornate gold (official)' },
                { value: 'double-line', label: 'Double line' },
                { value: 'minimal', label: 'Minimal single line' },
                { value: 'none', label: 'No border' },
              ]}
            />
            <Row>
              <Color label="Light tone" value={cfg.frame.colorA} onChange={(v) => patch('frame', { colorA: v })} />
              <Color label="Deep tone" value={cfg.frame.colorB} onChange={(v) => patch('frame', { colorB: v })} />
            </Row>
            <Row>
              <Color label="Accent / corners" value={cfg.frame.colorAccent} onChange={(v) => patch('frame', { colorAccent: v })} />
              <Num label="Thickness" suffix="px" value={cfg.frame.thickness} min={0} max={80} onChange={(v) => patch('frame', { thickness: v })} />
            </Row>
            <Num label="Outer margin" suffix="px" value={cfg.frame.inset} min={0} max={60} onChange={(v) => patch('frame', { inset: v })} />
          </Section>

          <Section title="Fonts & ink">
            <Text label="Heading font stack" value={cfg.theme.fontHeading} onChange={(v) => patch('theme', { fontHeading: v })} mono />
            <Text label="Body font stack" value={cfg.theme.fontBody} onChange={(v) => patch('theme', { fontBody: v })} mono />
            <Text label="Signature font stack" value={cfg.theme.fontSignature} onChange={(v) => patch('theme', { fontSignature: v })} mono />
            <Row>
              <Color label="Body ink" value={cfg.theme.ink} onChange={(v) => patch('theme', { ink: v })} />
              <Color label="Bold accent" value={cfg.theme.accent} onChange={(v) => patch('theme', { accent: v })} />
            </Row>
          </Section>

          <Section title="Header & organisation logos">
            <ImagePick
              label="Main logo (top left)"
              value={cfg.header.leftLogo.url}
              onChange={(v) => patch('header', { leftLogo: { ...cfg.header.leftLogo, url: v } })}
              hint="SVG recommended. Uploads are stored inside the template."
            />
            <Row>
              <Num
                label="Logo height"
                suffix="px"
                value={cfg.header.leftLogo.height}
                min={20}
                max={200}
                onChange={(v) => patch('header', { leftLogo: { ...cfg.header.leftLogo, height: v } })}
              />
              <Num label="Tagline size" suffix="px" value={cfg.header.leftTaglineSize} min={5} max={20} step={0.5} onChange={(v) => patch('header', { leftTaglineSize: v })} />
            </Row>
            <Text label="Tagline under logo" value={cfg.header.leftTagline} onChange={(v) => patch('header', { leftTagline: v })} />

            <p className="pt-2 text-[11px] font-semibold tracking-wide text-navy-500 uppercase">Top-right logos</p>
            <LogoList which="rightLogos" />
          </Section>

          <Section title="Title block">
            <Text label="Title" value={cfg.title.text} onChange={(v) => patch('title', { text: v })} />
            <Row>
              <Color label="Title colour" value={cfg.title.color} onChange={(v) => patch('title', { color: v })} />
              <Num label="Title size" suffix="px" value={cfg.title.size} min={20} max={120} onChange={(v) => patch('title', { size: v })} />
            </Row>
            <Row>
              <Num label="Letter spacing" suffix="px" value={cfg.title.letterSpacing} min={-2} max={20} step={0.5} onChange={(v) => patch('title', { letterSpacing: v })} />
              <Num label="Space above" suffix="px" value={cfg.title.marginTop} min={0} max={80} onChange={(v) => patch('title', { marginTop: v })} />
            </Row>
            <Text label="Subtitle" value={cfg.title.subtitle} onChange={(v) => patch('title', { subtitle: v })} />
            <Row>
              <Color label="Subtitle colour" value={cfg.title.subtitleColor} onChange={(v) => patch('title', { subtitleColor: v })} />
              <Num label="Subtitle size" suffix="px" value={cfg.title.subtitleSize} min={10} max={60} onChange={(v) => patch('title', { subtitleSize: v })} />
            </Row>
            <Toggle label="Show rules beside subtitle" checked={cfg.title.rules} onChange={(v) => patch('title', { rules: v })} />
            {cfg.title.rules && (
              <Row>
                <Color label="Rule colour" value={cfg.title.ruleColor} onChange={(v) => patch('title', { ruleColor: v })} />
                <Num label="Rule span" suffix="%" value={cfg.title.ruleSpan} min={20} max={100} onChange={(v) => patch('title', { ruleSpan: v })} />
              </Row>
            )}
          </Section>

          <Section title={`Body lines (${cfg.body.blocks.length})`} hint="The sentences printed on the certificate">
            <div className="rounded-lg border border-navy-100 bg-navy-50 p-3">
              <p className="text-[11px] font-semibold tracking-wide text-navy-500 uppercase">Available placeholders</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {placeholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={`${p.label} — click to copy`}
                    onClick={() => navigator.clipboard?.writeText(`{{${p.key}}}`)}
                    className="rounded border border-navy-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-navy-600 hover:bg-navy-100"
                  >
                    {`{{${p.key}}}`}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-navy-400">
                Click to copy. Wrap text in <code className="font-mono">**double asterisks**</code> to bold it.
              </p>
            </div>

            {cfg.body.blocks.map((b, i) => (
              <div key={b.id} className={`rounded-lg border p-3 ${b.hidden ? 'border-navy-100 bg-navy-50/60 opacity-70' : 'border-navy-100'}`}>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="flex-1 truncate text-xs font-semibold text-navy-700">Line {i + 1}</span>
                  <MiniBtn onClick={() => setBlock(b.id, { hidden: !b.hidden })} title={b.hidden ? 'Show' : 'Hide'}>
                    {b.hidden ? '◌' : '●'}
                  </MiniBtn>
                  <MiniBtn onClick={() => moveBlock(b.id, -1)} disabled={i === 0} title="Move up">
                    ↑
                  </MiniBtn>
                  <MiniBtn onClick={() => moveBlock(b.id, 1)} disabled={i === cfg.body.blocks.length - 1} title="Move down">
                    ↓
                  </MiniBtn>
                  <MiniBtn onClick={() => removeBlock(b.id)} danger title="Delete line">
                    ✕
                  </MiniBtn>
                </div>

                <Area label="Content" value={b.content} onChange={(v) => setBlock(b.id, { content: v })} rows={2} />

                <Row cols={3}>
                  <Pick
                    label="Type"
                    value={b.type}
                    onChange={(v) => setBlock(b.id, { type: v })}
                    options={[
                      { value: 'text', label: 'Line' },
                      { value: 'paragraph', label: 'Paragraph' },
                      { value: 'spacer', label: 'Spacer' },
                      { value: 'divider', label: 'Divider' },
                    ]}
                  />
                  <Num label="Size" suffix="px" value={b.size} min={6} max={72} step={0.5} onChange={(v) => setBlock(b.id, { size: v })} />
                  <Num label="Space above" suffix="px" value={b.marginTop} min={0} max={80} onChange={(v) => setBlock(b.id, { marginTop: v })} />
                </Row>

                <Row cols={3}>
                  <Pick
                    label="Weight"
                    value={b.weight}
                    onChange={(v) => setBlock(b.id, { weight: v })}
                    options={[
                      { value: 'normal', label: 'Normal' },
                      { value: 'semibold', label: 'Semibold' },
                      { value: 'bold', label: 'Bold' },
                    ]}
                  />
                  <Pick
                    label="Align"
                    value={b.align}
                    onChange={(v) => setBlock(b.id, { align: v })}
                    options={[
                      { value: 'left', label: 'Left' },
                      { value: 'center', label: 'Centre' },
                      { value: 'right', label: 'Right' },
                    ]}
                  />
                  <Num label="Max width" suffix="%" value={b.maxWidth ?? 96} min={20} max={100} onChange={(v) => setBlock(b.id, { maxWidth: v })} />
                </Row>

                <Row>
                  <Color label="Colour" value={b.color} onChange={(v) => setBlock(b.id, { color: v })} />
                  <Num label="Line height" value={b.lineHeight ?? 1.28} min={0.8} max={3} step={0.02} onChange={(v) => setBlock(b.id, { lineHeight: v })} />
                </Row>
              </div>
            ))}

            <MiniBtn onClick={addBlock}>+ Add line</MiniBtn>
          </Section>

          <Section title="QR code" hint="Scannable link to the public verification page">
            <Toggle label="Print QR code on certificate" checked={cfg.qr.enabled} onChange={(v) => patch('qr', { enabled: v })} />
            {cfg.qr.enabled && (
              <>
                <Pick
                  label="Position"
                  value={cfg.qr.position}
                  onChange={(v) => patch('qr', { position: v })}
                  options={[
                    { value: 'bottom-left', label: 'Bottom left (beside verify badge)' },
                    { value: 'above-verify-badge', label: 'Above verify badge' },
                    { value: 'bottom-right', label: 'Bottom right corner' },
                    { value: 'bottom-center', label: 'Bottom centre' },
                    { value: 'top-left', label: 'Top left corner' },
                    { value: 'top-right', label: 'Top right corner' },
                  ]}
                />
                <Row>
                  <Num label="Size" suffix="px" value={cfg.qr.size} min={40} max={200} onChange={(v) => patch('qr', { size: v })} />
                  <Color label="Module colour" value={cfg.qr.color} onChange={(v) => patch('qr', { color: v })} />
                </Row>
                <Row>
                  <Text label="Caption" value={cfg.qr.caption} onChange={(v) => patch('qr', { caption: v })} />
                  <Num label="Caption size" suffix="px" value={cfg.qr.captionSize} min={5} max={20} step={0.5} onChange={(v) => patch('qr', { captionSize: v })} />
                </Row>
                <Toggle label="Draw border around QR" checked={cfg.qr.showBorder} onChange={(v) => patch('qr', { showBorder: v })} />
              </>
            )}
          </Section>

          <Section title="Certificate number">
            <Toggle label="Print the certificate number" checked={cfg.certNo.show} onChange={(v) => patch('certNo', { show: v })} />
            <Text
              label="Number format"
              value={cfg.certNo.format}
              onChange={(v) => patch('certNo', { format: v })}
              mono
            />
            <p className="text-[11px] text-navy-400">
              Tokens: <code className="font-mono">{'{YEAR}'}</code> <code className="font-mono">{'{YY}'}</code>{' '}
              <code className="font-mono">{'{MONTH}'}</code> <code className="font-mono">{'{SEQ}'}</code>{' '}
              <code className="font-mono">{'{RAND}'}</code>. Applies to newly issued certificates only.
            </p>
            {cfg.certNo.show && (
              <>
                <Row>
                  <Text label="Label" value={cfg.certNo.label} onChange={(v) => patch('certNo', { label: v })} />
                  <Num label="Size" suffix="px" value={cfg.certNo.size} min={6} max={24} step={0.5} onChange={(v) => patch('certNo', { size: v })} />
                </Row>
                <Row>
                  <Pick
                    label="Position"
                    value={cfg.certNo.position}
                    onChange={(v) => patch('certNo', { position: v })}
                    options={[
                      { value: 'under-qr', label: 'Under the QR code' },
                      { value: 'bottom-center', label: 'Bottom centre' },
                      { value: 'bottom-left', label: 'Bottom left' },
                      { value: 'bottom-right', label: 'Bottom right' },
                      { value: 'top-right', label: 'Top right' },
                    ]}
                  />
                  <Color label="Colour" value={cfg.certNo.color} onChange={(v) => patch('certNo', { color: v })} />
                </Row>
                <Toggle label="Also show the issue date" checked={cfg.certNo.showIssueDate} onChange={(v) => patch('certNo', { showIssueDate: v })} />
                {cfg.certNo.showIssueDate && (
                  <Text label="Issue-date label" value={cfg.certNo.issueDateLabel} onChange={(v) => patch('certNo', { issueDateLabel: v })} />
                )}
              </>
            )}
          </Section>

          <Section title="Verify badge">
            <Toggle label="Show the verify badge" checked={cfg.verifyBadge.enabled} onChange={(v) => patch('verifyBadge', { enabled: v })} />
            {cfg.verifyBadge.enabled && (
              <>
                <Text label="Heading" value={cfg.verifyBadge.heading} onChange={(v) => patch('verifyBadge', { heading: v })} />
                <Text label="Domain" value={cfg.verifyBadge.domain} onChange={(v) => patch('verifyBadge', { domain: v })} />
                <Text label="Email" value={cfg.verifyBadge.email} onChange={(v) => patch('verifyBadge', { email: v })} />
                <Row cols={3}>
                  <Color label="Background" value={cfg.verifyBadge.bg} onChange={(v) => patch('verifyBadge', { bg: v })} />
                  <Color label="Text" value={cfg.verifyBadge.fg} onChange={(v) => patch('verifyBadge', { fg: v })} />
                  <Color label="Accent" value={cfg.verifyBadge.accent} onChange={(v) => patch('verifyBadge', { accent: v })} />
                </Row>
              </>
            )}
          </Section>

          <Section title="Accreditation logos (footer)">
            <LogoList which="footerLogos" />
          </Section>

          <Section title="Signature block">
            <Toggle label="Show signature block" checked={cfg.signature.enabled} onChange={(v) => patch('signature', { enabled: v })} />
            {cfg.signature.enabled && (
              <>
                <Area label="Company name" value={cfg.signature.company} onChange={(v) => patch('signature', { company: v })} rows={2} hint="Line breaks are preserved." />
                <ImagePick
                  label="Signature image"
                  value={cfg.signature.signatureImage}
                  onChange={(v) => patch('signature', { signatureImage: v })}
                  hint="Upload a scanned signature (PNG with transparency works best). Overrides the text below."
                />
                <Row>
                  <Text label="Signature text" value={cfg.signature.signatureText} onChange={(v) => patch('signature', { signatureText: v })} />
                  <Text label="Designation" value={cfg.signature.signerTitle} onChange={(v) => patch('signature', { signerTitle: v })} />
                </Row>
                <Color label="Colour" value={cfg.signature.color} onChange={(v) => patch('signature', { color: v })} />
              </>
            )}
          </Section>

          <Section title="Footer note">
            <Text label="Text" value={cfg.footerNote.text} onChange={(v) => patch('footerNote', { text: v })} />
            <Row>
              <Num label="Size" suffix="px" value={cfg.footerNote.size} min={6} max={28} step={0.5} onChange={(v) => patch('footerNote', { size: v })} />
              <Color label="Colour" value={cfg.footerNote.color} onChange={(v) => patch('footerNote', { color: v })} />
            </Row>
          </Section>

          <Section title="Watermark">
            <Toggle label="Show watermark" checked={cfg.watermark.enabled} onChange={(v) => patch('watermark', { enabled: v })} />
            {cfg.watermark.enabled && (
              <>
                <Text label="Watermark text" value={cfg.watermark.text} onChange={(v) => patch('watermark', { text: v })} />
                <ImagePick label="Watermark image" value={cfg.watermark.image} onChange={(v) => patch('watermark', { image: v })} hint="Overrides the text when set." />
                <Row cols={3}>
                  <Num label="Opacity" value={cfg.watermark.opacity} min={0.01} max={0.5} step={0.01} onChange={(v) => patch('watermark', { opacity: v })} />
                  <Num label="Size" suffix="px" value={cfg.watermark.size} min={20} max={300} onChange={(v) => patch('watermark', { size: v })} />
                  <Num label="Rotate" suffix="deg" value={cfg.watermark.rotate} min={-90} max={90} onChange={(v) => patch('watermark', { rotate: v })} />
                </Row>
              </>
            )}
          </Section>

          <Section title={`Data columns (${cfg.fields.length})`} hint="Which values this certificate stores and prints">
            <p className="rounded-lg border border-navy-100 bg-navy-50 p-3 text-[11px] leading-relaxed text-navy-500">
              Each column becomes a <code className="font-mono">{'{{placeholder}}'}</code> you can use in the body lines.
              <strong className="text-navy-700"> Source</strong> is the application field the value is read from — leave it
              blank for a fixed value you type here.
            </p>

            {cfg.fields.map((f, i) => (
              <div key={f.key} className="rounded-lg border border-navy-100 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-[11px] text-navy-600">{`{{${f.key}}}`}</code>
                  {f.system ? (
                    <span className="badge bg-navy-100 text-navy-500">system</span>
                  ) : (
                    <MiniBtn onClick={() => setFields(cfg.fields.filter((_, k) => k !== i))} danger title="Remove column">
                      ✕
                    </MiniBtn>
                  )}
                </div>
                <Row>
                  <Text
                    label="Label"
                    value={f.label}
                    onChange={(v) => setFields(cfg.fields.map((x, k) => (k === i ? { ...x, label: v } : x)))}
                  />
                  <Pick
                    label="Type"
                    value={f.type}
                    onChange={(v) => setFields(cfg.fields.map((x, k) => (k === i ? { ...x, type: v } : x)))}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'number', label: 'Number' },
                      { value: 'date', label: 'Date' },
                      { value: 'select', label: 'Choice' },
                    ]}
                  />
                </Row>
                <Row>
                  <Text
                    label="Source column"
                    value={f.source}
                    onChange={(v) => setFields(cfg.fields.map((x, k) => (k === i ? { ...x, source: v } : x)))}
                    mono
                  />
                  <Text
                    label="Fixed / default value"
                    value={f.defaultValue ?? ''}
                    onChange={(v) => setFields(cfg.fields.map((x, k) => (k === i ? { ...x, defaultValue: v } : x)))}
                  />
                </Row>
              </div>
            ))}

            <MiniBtn
              onClick={() => {
                const label = prompt('Column label (e.g. "Grade")');
                if (!label) return;
                const key = label
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '_')
                  .replace(/^_|_$/g, '');
                if (!key) return;
                if (cfg.fields.some((f) => f.key === key)) {
                  alert(`A column with the placeholder {{${key}}} already exists.`);
                  return;
                }
                setFields([...cfg.fields, { key, label, type: 'text', source: '', required: false, defaultValue: '' }]);
              }}
            >
              + Add data column
            </MiniBtn>
          </Section>
        </div>

        {/* ----------------------------- preview ---------------------------- */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-navy-900">Live preview</h2>
            <p className="text-xs text-navy-400">Sample data · {cfg.page.width} × {cfg.page.height} px</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-sm">
            <CertificateStage width={cfg.page.width} height={cfg.page.height}>
              <CertificateArtwork config={cfg} data={data} qr={qr} />
            </CertificateStage>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-navy-400">
            Changes here affect certificates issued or rebuilt from now on. Already-issued certificates keep their
            snapshot until you rebuild them from the certificate page — printed copies and QR codes stay valid either
            way.
          </p>
        </div>
      </div>
    </div>
  );
}
