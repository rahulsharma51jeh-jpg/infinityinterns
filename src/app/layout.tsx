import type { Metadata } from 'next';
import { Inter, Tinos, Mulish, Caveat } from 'next/font/google';
import './globals.css';

const ui = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
/** Times-metric serif for the certificate title. */
const certSerif = Tinos({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-cert-serif', display: 'swap' });
/** Humanist sans for the certificate body copy. */
const certSans = Mulish({ subsets: ['latin'], variable: '--font-cert-sans', display: 'swap' });
/** Handwriting for the authorised signature. */
const certScript = Caveat({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-cert-script', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Infinity Interns — Internship Portal & Certificate Verification',
    template: '%s · Infinity Interns',
  },
  description:
    'Apply for mentor-guided online internships, track your progress and get a verifiable completion certificate with a QR code. Verify any Infinity Interns certificate by its certificate number.',
  keywords: ['internship', 'Infinity Interns', 'certificate verification', 'online internship', 'AICTE'],
  openGraph: {
    title: 'Infinity Interns — Internship Portal',
    description: 'Mentor-guided online internships with QR-verifiable completion certificates.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${ui.variable} ${certSerif.variable} ${certSans.variable} ${certScript.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
