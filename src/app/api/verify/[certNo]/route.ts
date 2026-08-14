import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { baseUrlFrom, findCertificate, logVerification } from '@/lib/certificate';
import type { CertData } from '@/lib/render';

/**
 * Public verification API.
 *   GET /api/verify/IIN-2026-01001
 * Always 200 with `found` / `valid` flags so integrators can branch on the body
 * rather than on status codes; 404 is reserved for a malformed request.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ certNo: string }> }) {
  const { certNo: raw } = await params;
  const certNo = decodeURIComponent(raw).trim().toUpperCase();

  const h = await headers();
  const baseUrl = baseUrlFrom(h);
  const cert = findCertificate(certNo);

  logVerification(certNo, Boolean(cert), 'api', h.get('x-forwarded-for') ?? '', h.get('user-agent') ?? '');

  if (!cert) {
    return NextResponse.json(
      { found: false, valid: false, certificate_no: certNo, message: 'No certificate found with this number.' },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  const d = JSON.parse(cert.data) as CertData;

  return NextResponse.json(
    {
      found: true,
      valid: cert.status === 'active',
      status: cert.status,
      certificate_no: cert.cert_no,
      intern_name: d.intern_name ?? null,
      salutation: d.salutation ?? null,
      institute: d.college ?? null,
      course: d.course ?? null,
      domain: d.domain ?? null,
      duration: d.duration ?? null,
      mode: d.mode ?? null,
      start_date: d.start_date ?? null,
      end_date: d.end_date ?? null,
      attendance_percent: d.attendance ?? null,
      marks_percent: d.marks ?? null,
      issued_on: cert.issued_on,
      revoke_reason: cert.status === 'revoked' ? cert.revoke_reason || null : null,
      verify_url: `${baseUrl}/verify/${encodeURIComponent(cert.cert_no)}`,
      issuer: 'Infinity Interns (Infinity1 Career Counselling Private Limited)',
    },
    { headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } },
  );
}
