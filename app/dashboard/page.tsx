"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"

interface InternProfile {
  id: string
  college: string
  course: string | null
  semester: string | null
  internshipDomain: string
  duration: string
  startDate: string
  endDate: string
  attendance: number | null
  marksSecured: number | null
  status: string
  applicationDate: string
  approvedAt: string | null
  rejectedAt: string | null
  adminNotes: string | null
}

interface Certificate {
  id: string
  certificateNo: string
  internName: string
  college: string
  internshipDomain: string
  duration: string
  startDate: string
  endDate: string
  attendance: number
  marksSecured: number
  qrCodeData: string
  verificationUrl: string
  pdfUrl: string | null
  issuedAt: string
}

export default function InternDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<InternProfile | null>(null)
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.push("/admin")
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile()
      fetchCertificate()
    }
  }, [status])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/intern/profile")
      const data = await response.json()
      setProfile(data.profile)
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCertificate = async () => {
    try {
      const response = await fetch("/api/intern/certificate")
      const data = await response.json()
      if (data.certificate) {
        setCertificate(data.certificate)
      }
    } catch (error) {
      console.error("Failed to fetch certificate:", error)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (session?.user?.role === "ADMIN") {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "COMPLETED":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case "APPROVED":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case "REJECTED":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case "COMPLETED":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Infinity Interns</h1>
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Intern Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{session?.user?.name}</span>
              <Link
                href="/api/auth/signout"
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, {session?.user?.name}!</h2>
          <p className="text-gray-600 mt-1">Track your internship application and certificate status</p>
        </div>

        {!profile ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No application found. Please register for an internship.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application Status Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Application Status</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className={`p-3 rounded-full ${getStatusColor(profile.status)}`}>
                      {getStatusIcon(profile.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Status</p>
                      <p className={`text-2xl font-bold inline-flex items-center px-4 py-1 rounded-full ${getStatusColor(profile.status)}`}>
                        {profile.status}
                      </p>
                    </div>
                  </div>

                  {profile.status === "PENDING" && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Your application is under review. You'll be notified once it's approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.status === "REJECTED" && profile.adminNotes && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700 font-medium">Reason for rejection:</p>
                          <p className="text-sm text-red-700 mt-1">{profile.adminNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.status === "APPROVED" && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            Congratulations! Your application has been approved. Complete your internship to receive your certificate.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <p className="text-sm text-gray-500">Application Date</p>
                      <p className="text-gray-900 font-medium">
                        {format(new Date(profile.applicationDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    {profile.approvedAt && (
                      <div>
                        <p className="text-sm text-gray-500">Approved On</p>
                        <p className="text-gray-900 font-medium">
                          {format(new Date(profile.approvedAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Internship Details */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-xl font-bold text-gray-900">Internship Details</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Domain</p>
                      <p className="text-lg font-semibold text-indigo-600">{profile.internshipDomain}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-gray-900 font-medium">{profile.duration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="text-gray-900 font-medium">
                        {format(new Date(profile.startDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="text-gray-900 font-medium">
                        {format(new Date(profile.endDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">College</p>
                      <p className="text-gray-900 font-medium">{profile.college}</p>
                    </div>
                    {profile.course && (
                      <div>
                        <p className="text-sm text-gray-500">Course</p>
                        <p className="text-gray-900 font-medium">{profile.course}</p>
                      </div>
                    )}
                  </div>

                  {(profile.attendance !== null || profile.marksSecured !== null) && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {profile.attendance !== null && (
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Attendance</p>
                            <p className="text-2xl font-bold text-green-600">{profile.attendance}%</p>
                          </div>
                        )}
                        {profile.marksSecured !== null && (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Marks Secured</p>
                            <p className="text-2xl font-bold text-blue-600">{profile.marksSecured}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Certificate Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-6">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                  <h3 className="text-xl font-bold text-white">Certificate</h3>
                </div>
                <div className="p-6">
                  {certificate ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <svg className="mx-auto h-16 w-16 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <p className="text-lg font-bold text-gray-900 mb-1">Certificate Issued!</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Issued on {format(new Date(certificate.issuedAt), "dd MMM yyyy")}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Certificate Number</p>
                        <p className="text-sm font-mono font-bold text-gray-900 break-all">
                          {certificate.certificateNo}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {certificate.pdfUrl && (
                          <a
                            href={certificate.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                          >
                            Download PDF
                          </a>
                        )}
                        <Link
                          href={`/verify/${certificate.certificateNo}`}
                          className="block w-full text-center px-4 py-2 bg-white text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 font-medium transition-colors"
                        >
                          View Certificate
                        </Link>
                      </div>

                      <div className="pt-4 border-t">
                        <p className="text-xs text-gray-500 text-center mb-2">QR Code</p>
                        <img
                          src={certificate.qrCodeData}
                          alt="Certificate QR Code"
                          className="w-32 h-32 mx-auto border-2 border-gray-200 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Scan to verify
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-16 w-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">
                        {profile.status === "PENDING" && "Certificate will be available after approval"}
                        {profile.status === "APPROVED" && "Certificate will be issued upon completion"}
                        {profile.status === "REJECTED" && "Certificate not available"}
                        {profile.status === "COMPLETED" && "Certificate is being processed"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
