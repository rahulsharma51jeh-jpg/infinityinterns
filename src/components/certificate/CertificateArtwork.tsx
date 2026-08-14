import React from 'react';
import type { Block, TemplateConfig } from '@/lib/template';
import { boldSegments, interpolate, type CertData } from '@/lib/render';
import OrnateFrame from './OrnateFrame';

const WEIGHT: Record<string, number> = { normal: 400, semibold: 600, bold: 700 };

export interface CertificateArtworkProps {
  config: TemplateConfig;
  data: CertData;
  /** pre-rendered QR image (data URI); omit to hide */
  qr?: string | null;
  status?: 'active' | 'revoked';
  /** draw a diagonal watermark for previews of unsaved/sample data */
  draftLabel?: string | null;
}

/**
 * Renders the certificate at its exact design size (config.page.width x height).
 * Callers scale it with a CSS transform; nothing here depends on viewport size,
 * so the same markup is used for on-screen preview, print and PDF export.
 */
export default function CertificateArtwork({
  config: cfg,
  data,
  qr,
  status = 'active',
  draftLabel = null,
}: CertificateArtworkProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const pad = cfg.page.padding + cfg.frame.thickness + cfg.frame.inset;
  const txt = (s: string) => interpolate(s, data);

  const qrNode = cfg.qr.enabled && qr ? <QrBlock cfg={cfg} qr={qr} data={data} /> : null;
  const certNoNode = cfg.certNo.show ? <CertNo cfg={cfg} data={data} /> : null;

  const qrPos = cfg.qr.position;
  const inLeftCluster = qrPos === 'beside-verify-badge' || qrPos === 'above-verify-badge' || qrPos === 'bottom-left';
  const absoluteQr = !inLeftCluster;

  return (
    <div
      className="ii-cert"
      style={{
        position: 'relative',
        width: cfg.page.width,
        height: cfg.page.height,
        background: cfg.page.background,
        color: cfg.theme.ink,
        fontFamily: cfg.theme.fontBody,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <OrnateFrame frame={cfg.frame} width={cfg.page.width} height={cfg.page.height} uid={uid} />

      {cfg.watermark.enabled && <Watermark cfg={cfg} />}

      {/* ---- content area ---- */}
      <div
        style={{
          position: 'absolute',
          inset: pad,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 300 }}>
            {!cfg.header.leftLogo.hidden && cfg.header.leftLogo.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cfg.header.leftLogo.url}
                alt={cfg.header.leftLogo.label}
                style={{ height: cfg.header.leftLogo.height, width: 'auto', objectFit: 'contain' }}
              />
            )}
            {cfg.header.leftTagline && (
              <div
                style={{
                  fontSize: cfg.header.leftTaglineSize,
                  color: '#3a3a3a',
                  textAlign: 'center',
                  marginTop: 2,
                  lineHeight: 1.25,
                  maxWidth: 260,
                }}
              >
                {cfg.header.leftTagline}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            {cfg.header.rightLogos
              .filter((l) => !l.hidden && l.url)
              .map((l) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={l.id}
                  src={l.url}
                  alt={l.label}
                  style={{ height: l.height, width: 'auto', objectFit: 'contain' }}
                />
              ))}
          </div>
        </div>

        {/* title */}
        <div style={{ marginTop: cfg.title.marginTop, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: cfg.theme.fontHeading,
              fontSize: cfg.title.size,
              fontWeight: 700,
              color: cfg.title.color,
              letterSpacing: cfg.title.letterSpacing,
              lineHeight: 1.06,
            }}
          >
            {txt(cfg.title.text)}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              margin: '2px auto 0',
              width: `${cfg.title.ruleSpan ?? 64}%`,
            }}
          >
            {cfg.title.rules && <span style={{ flex: 1, height: 2, background: cfg.title.ruleColor }} />}
            <span
              style={{
                fontSize: cfg.title.subtitleSize,
                fontWeight: 700,
                color: cfg.title.subtitleColor,
                whiteSpace: 'nowrap',
                letterSpacing: 0.4,
              }}
            >
              {txt(cfg.title.subtitle)}
            </span>
            {cfg.title.rules && <span style={{ flex: 1, height: 2, background: cfg.title.ruleColor }} />}
          </div>
        </div>

        {/* body */}
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          {cfg.body.blocks.filter((b) => !b.hidden).map((b) => (
            <BlockView key={b.id} block={b} data={data} accent={cfg.theme.accent} />
          ))}
        </div>

        {/* footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          {/* left cluster: QR + verify badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: qrPos === 'above-verify-badge' ? 'column' : 'row',
              alignItems: qrPos === 'above-verify-badge' ? 'flex-start' : 'flex-end',
              gap: 10,
              minWidth: 0,
            }}
          >
            {inLeftCluster && qrNode}
            {cfg.verifyBadge.enabled && <VerifyBadge cfg={cfg} />}
          </div>

          {/* centre: accreditation logos */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20 }}>
            {cfg.footerLogos
              .filter((l) => !l.hidden && l.url)
              .map((l) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={l.id}
                  src={l.url}
                  alt={l.label}
                  style={{ height: l.height, width: 'auto', objectFit: 'contain' }}
                />
              ))}
          </div>

          {/* right: signature */}
          {cfg.signature.enabled ? <Signature cfg={cfg} /> : <div style={{ width: 170 }} />}
        </div>

        {/* footer note */}
        {cfg.footerNote.text && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 6,
              fontSize: cfg.footerNote.size,
              fontWeight: 700,
              color: cfg.footerNote.color,
            }}
          >
            {txt(cfg.footerNote.text)}
          </div>
        )}
      </div>

      {/* absolutely-positioned QR / cert-no variants */}
      {absoluteQr && qrNode && <div style={cornerStyle(qrPos, pad)}>{qrNode}</div>}
      {certNoNode && cfg.certNo.position !== 'under-qr' && (
        <div style={cornerStyle(cfg.certNo.position, pad)}>{certNoNode}</div>
      )}

      {status === 'revoked' && <Stamp text="REVOKED" color="#c81e1e" />}
      {draftLabel && <Stamp text={draftLabel} color="#6b7280" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function cornerStyle(pos: string, pad: number): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', display: 'flex' };
  switch (pos) {
    case 'top-left':
      return { ...base, top: pad, left: pad };
    case 'top-right':
      return { ...base, top: pad, right: pad };
    case 'bottom-right':
      return { ...base, bottom: pad, right: pad };
    case 'bottom-center':
      return { ...base, bottom: pad - 4, left: 0, right: 0, justifyContent: 'center' };
    case 'bottom-left':
    default:
      return { ...base, bottom: pad, left: pad };
  }
}

function BlockView({ block: b, data, accent }: { block: Block; data: CertData; accent: string }) {
  if (b.type === 'spacer') return <div style={{ height: b.marginTop || 12 }} />;
  if (b.type === 'divider')
    return (
      <div style={{ marginTop: b.marginTop }}>
        <hr style={{ border: 0, borderTop: `1.5px solid ${b.color}`, width: `${b.maxWidth ?? 40}%`, margin: '0 auto' }} />
      </div>
    );

  const segs = boldSegments(interpolate(b.content, data));

  return (
    <div
      style={{
        marginTop: b.marginTop,
        fontSize: b.size,
        fontWeight: WEIGHT[b.weight] ?? 400,
        color: b.color,
        textAlign: b.align,
        fontStyle: b.italic ? 'italic' : 'normal',
        lineHeight: b.lineHeight ?? 1.28,
        // Cap the width even for single-line blocks so an unusually long name
        // wraps instead of bleeding out through the decorative frame.
        maxWidth: `${b.maxWidth ?? 96}%`,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      {segs.map((s, i) =>
        s.bold ? (
          <strong key={i} style={{ fontWeight: 700, color: accent }}>
            {s.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </div>
  );
}

function QrBlock({ cfg, qr, data }: { cfg: TemplateConfig; qr: string; data: CertData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt="Certificate verification QR code"
        style={{
          width: cfg.qr.size,
          height: cfg.qr.size,
          border: cfg.qr.showBorder ? `1.5px solid ${cfg.qr.color}` : 'none',
          borderRadius: 4,
          background: '#fff',
          padding: 2,
        }}
      />
      {cfg.qr.caption && (
        <div style={{ fontSize: cfg.qr.captionSize, color: cfg.qr.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {cfg.qr.caption}
        </div>
      )}
      {cfg.certNo.show && cfg.certNo.position === 'under-qr' && <CertNo cfg={cfg} data={data} />}
    </div>
  );
}

function CertNo({ cfg, data }: { cfg: TemplateConfig; data: CertData }) {
  return (
    <div style={{ fontSize: cfg.certNo.size, color: cfg.certNo.color, lineHeight: 1.35, textAlign: 'center' }}>
      <div style={{ whiteSpace: 'nowrap' }}>
        <span>{cfg.certNo.label} </span>
        <strong style={{ fontWeight: 700, letterSpacing: 0.3 }}>{data.cert_no}</strong>
      </div>
      {cfg.certNo.showIssueDate && data.issue_date && (
        <div style={{ whiteSpace: 'nowrap' }}>
          {cfg.certNo.issueDateLabel} {data.issue_date}
        </div>
      )}
    </div>
  );
}

function VerifyBadge({ cfg }: { cfg: TemplateConfig }) {
  const v = cfg.verifyBadge;
  const [head, ...rest] = v.domain.split(/(?=interns)/i);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: v.bg,
        color: v.fg,
        borderRadius: 8,
        padding: '8px 13px 8px 9px',
      }}
    >
      <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
        <path d="M17 1 L32 6 v14 c0 9-7 15-15 19 C9 35 2 29 2 20 V6 Z" fill="#fff" stroke="#d9dde6" strokeWidth="1" />
        <path d="M9 20 l5 5 l11-12" fill="none" stroke={v.accent} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 12 }}>{v.heading}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          <span>{head}</span>
          <span style={{ color: v.accent }}>{rest.join('')}</span>
        </div>
        <div style={{ fontSize: 10, textAlign: 'center', margin: '1px 0' }}>or</div>
        <div style={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="9" viewBox="0 0 14 10" aria-hidden>
            <rect x="0.6" y="0.6" width="12.8" height="8.8" rx="1.4" fill="none" stroke={v.fg} strokeWidth="1.2" />
            <path d="M1 1.4 L7 6 L13 1.4" fill="none" stroke={v.fg} strokeWidth="1.2" />
          </svg>
          {v.email}
        </div>
      </div>
    </div>
  );
}

function Signature({ cfg }: { cfg: TemplateConfig }) {
  const s = cfg.signature;
  return (
    <div style={{ textAlign: 'center', color: s.color, width: 236 }}>
      {s.company && (
        <div
          style={{
            fontFamily: cfg.theme.fontHeading,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'pre-line',
          }}
        >
          {s.company}
        </div>
      )}
      {s.signatureImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.signatureImage} alt="Authorised signature" style={{ height: 40, margin: '1px auto 0' }} />
      ) : (
        <div style={{ fontFamily: cfg.theme.fontSignature, fontSize: 29, lineHeight: 1.1, marginTop: 1 }}>
          {s.signatureText}
        </div>
      )}
      <div style={{ fontFamily: cfg.theme.fontHeading, fontSize: 14, fontWeight: 700, marginTop: -1 }}>
        {s.signerTitle}
      </div>
    </div>
  );
}

function Watermark({ cfg }: { cfg: TemplateConfig }) {
  const w = cfg.watermark;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: w.opacity,
        transform: `rotate(${w.rotate}deg)`,
        pointerEvents: 'none',
      }}
    >
      {w.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={w.image} alt="" style={{ width: w.size * 4, objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            fontFamily: cfg.theme.fontHeading,
            fontSize: w.size,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            color: cfg.theme.ink,
          }}
        >
          {w.text}
        </div>
      )}
    </div>
  );
}

function Stamp({ text, color }: { text: string; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          transform: 'rotate(-18deg)',
          border: `9px solid ${color}`,
          color,
          opacity: 0.5,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: 8,
          padding: '10px 40px',
          borderRadius: 14,
        }}
      >
        {text}
      </div>
    </div>
  );
}
