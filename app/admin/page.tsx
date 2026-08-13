"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface InternProfile {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
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
  phone: string | null
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [interns, setInterns] = useState<InternProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("PENDING")

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
    }
  }, [status, session, router])

  useEffect(() => {
    fetchInterns()
  }, [filter])

  const fetchInterns = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/interns?status=${filter}`)
      const data = await response.json()
      setInterns(data.interns || [])
    } catch (error) {
      console.error("Failed to fetch interns:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (internId: string) => {
    if (!confirm("Are you sure you want to approve this intern?")) return

    try {
      const response = await fetch("/api/admin/interns/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId }),
      })

      if (response.ok) {
        alert("Intern approved successfully!")
        fetchInterns()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to approve intern")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleReject = async (internId: string) => {
    const reason = prompt("Enter rejection reason (optional):")
    if (reason === null) return

    try {
      const response = await fetch("/api/admin/interns/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId, reason }),
      })

      if (response.ok) {
        alert("Intern application rejected")
        fetchInterns()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to reject intern")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleUpdateMetrics = async (internId: string) => {
    const attendance = prompt("Enter attendance percentage (0-100):")
    if (!attendance) return
    
    const marks = prompt("Enter marks secured percentage (0-100):")
    if (!marks) return

    try {
      const response = await fetch("/api/admin/interns/update-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          internId, 
          attendance: parseFloat(attendance), 
          marksSecured: parseFloat(marks) 
        }),
      })

      if (response.ok) {
        alert("Metrics updated successfully!")
        fetchInterns()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update metrics")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleGenerateCertificate = async (internId: string) => {
    if (!confirm("Generate certificate for this intern? Make sure attendance and marks are updated.")) return

    try {
      const response = await fetch("/api/admin/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Certificate generated successfully! Certificate No: ${data.certificateNo}`)
        fetchInterns()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to generate certificate")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Infinity Interns</h1>
              <span className="ml-4 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Admin
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{session.user.name}</span>
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
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Intern Management</h2>
          
          <div className="flex space-x-2 mb-4">
            {["PENDING", "APPROVED", "REJECTED", "COMPLETED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {interns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No interns found with status: {filter}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {intern.user.name}
                        </div>
                        <div className="text-sm text-gray-500">{intern.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{intern.college}</div>
                      {intern.course && (
                        <div className="text-sm text-gray-500">{intern.course}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {intern.internshipDomain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {intern.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {intern.attendance !== null && intern.marksSecured !== null ? (
                        <div>
                          <div>Att: {intern.attendance}%</div>
                          <div>Marks: {intern.marksSecured}%</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        {intern.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(intern.id)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(intern.id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {intern.status === "APPROVED" && (
                          <>
                            <button
                              onClick={() => handleUpdateMetrics(intern.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Update Metrics
                            </button>
                            <button
                              onClick={() => handleGenerateCertificate(intern.id)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              Generate Certificate
                            </button>
                          </>
                        )}
                        {intern.status === "COMPLETED" && (
                          <Link
                            href={`/admin/certificates?userId=${intern.user.id}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Certificate
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
