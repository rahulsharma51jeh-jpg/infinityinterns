import { headers } from 'next/headers';
import { baseUrlFrom, findCertificate, qrPngBuffer } from '@/lib/certificate';

/**
 * PNG QR code for a certificate, pointing at its public verification page.
 *   GET /api/qr/IIN-2026-01001?size=800&download=1
 */
export async function GET(req: Request, { params }: { params: Promise<{ certNo: string }> }) {
  const { certNo: raw } = await params;
  const certNo = decodeURIComponent(raw);
  const cert = findCertificate(certNo);
  if (!cert) return new Response('Certificate not found', { status: 404 });

  const url = new URL(req.url);
  const size = Math.min(2000, Math.max(120, Number(url.searchParams.get('size')) || 600));
  const download = url.searchParams.get('download') === '1';

  const h = await headers();
  const verifyUrl = `${baseUrlFrom(h)}/verify/${encodeURIComponent(cert.cert_no)}?src=qr`;
  const png = await qrPngBuffer(verifyUrl, '#0f2547', size);

  return new Response(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
      ...(download
        ? { 'content-disposition': `attachment; filename="${cert.cert_no}-verify-qr.png"` }
        : {}),
    },
  });
}
