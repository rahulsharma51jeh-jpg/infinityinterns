import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import Link from "next/link"

interface PageProps {
  params: Promise<{
    certificateNo: string
  }>
}

async function getCertificate(certificateNo: string) {
  const certificate = await prisma.certificate.findUnique({
    where: {
      certificateNo: certificateNo,
      isActive: true,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  return certificate
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { certificateNo } = await params
  const certificate = await getCertificate(certificateNo)

  if (!certificate) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Certificate Verification
          </h1>
          <p className="text-gray-600">
            Official verification from Infinity Interns
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-2xl font-bold text-white">
                    Verified Certificate
                  </span>
                </div>
                <p className="text-indigo-100 mt-1 text-sm">
                  This certificate has been verified as authentic
                </p>
              </div>
              <div className="text-right">
                <div className="text-white text-sm font-medium">Certificate No.</div>
                <div className="text-indigo-100 text-lg font-bold">
                  {certificate.certificateNo}
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Intern Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Intern Information
                </h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {certificate.internName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    College/University
                  </label>
                  <p className="text-gray-900">{certificate.college}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-gray-900">{certificate.user.email}</p>
                </div>
              </div>

              {/* Internship Details */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Internship Details
                </h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Domain
                  </label>
                  <p className="text-lg font-semibold text-indigo-600">
                    {certificate.internshipDomain}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Duration
                  </label>
                  <p className="text-gray-900">{certificate.duration}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Period
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(certificate.startDate), "dd MMM yyyy")} -{" "}
                    {format(new Date(certificate.endDate), "dd MMM yyyy")}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Performance
                </h2>
                
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Attendance
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      {certificate.attendance}%
                    </p>
                  </div>
                  <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Marks Secured
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {certificate.marksSecured}%
                    </p>
                  </div>
                  <svg
                    className="w-12 h-12 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
              </div>

              {/* Certificate Status */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Certificate Status
                </h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Issue Date
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(certificate.issuedAt), "dd MMMM yyyy")}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Active & Valid
                    </span>
                  </div>
                </div>

                {certificate.pdfUrl && (
                  <div className="mt-4">
                    <a
                      href={certificate.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download Certificate PDF
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Display */}
            <div className="mt-8 pt-8 border-t text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                QR Code for Quick Verification
              </h3>
              <div className="flex justify-center">
                <img
                  src={certificate.qrCodeData}
                  alt="Certificate QR Code"
                  className="w-48 h-48 border-4 border-gray-200 rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Scan this QR code to verify this certificate
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Secured by Infinity Interns</span>
              </div>
              <div>
                AICTE Approved & ISO Certified Platform
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 text-center space-y-4">
          <Link
            href="/verify"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Verify Another Certificate
          </Link>
          <div className="text-sm text-gray-500">
            <p>
              For any queries regarding this certificate, please contact{" "}
              <a href="mailto:info@infinityinterns.com" className="text-indigo-600 hover:underline">
                info@infinityinterns.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
