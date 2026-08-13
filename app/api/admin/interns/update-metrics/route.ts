import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { internId, attendance, marksSecured } = await req.json()

    if (!internId || attendance === undefined || marksSecured === undefined) {
      return NextResponse.json(
        { error: "Intern ID, attendance, and marks are required" },
        { status: 400 }
      )
    }

    // Validate ranges
    if (attendance < 0 || attendance > 100 || marksSecured < 0 || marksSecured > 100) {
      return NextResponse.json(
        { error: "Attendance and marks must be between 0 and 100" },
        { status: 400 }
      )
    }

    const internProfile = await prisma.internProfile.update({
      where: { id: internId },
      data: {
        attendance: parseFloat(attendance),
        marksSecured: parseFloat(marksSecured),
      },
    })

    return NextResponse.json({
      message: "Metrics updated successfully",
      intern: internProfile,
    })
  } catch (error) {
    console.error("Error updating metrics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
