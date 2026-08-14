import type { CertificateView } from '@/lib/certificate';
import CertificateArtwork from './CertificateArtwork';
import CertificateStage from './CertificateStage';

/**
 * Screen-friendly wrapper: scales the fixed-size artwork into the available
 * width. Carries `print-stage` so the print stylesheet can undo the scaling.
 */
export default function CertificatePreview({
  view,
  maxScale = 1,
  draftLabel = null,
  className = '',
}: {
  view: Pick<CertificateView, 'config' | 'data' | 'qr'> & { cert?: { status: 'active' | 'revoked' } };
  maxScale?: number;
  draftLabel?: string | null;
  className?: string;
}) {
  return (
    <CertificateStage
      width={view.config.page.width}
      height={view.config.page.height}
      maxScale={maxScale}
      className={`print-stage ${className}`}
    >
      <CertificateArtwork
        config={view.config}
        data={view.data}
        qr={view.qr}
        status={view.cert?.status ?? 'active'}
        draftLabel={draftLabel}
      />
    </CertificateStage>
  );
}
