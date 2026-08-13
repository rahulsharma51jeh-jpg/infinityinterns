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

    const { internId } = await req.json()

    if (!internId) {
      return NextResponse.json(
        { error: "Intern ID is required" },
        { status: 400 }
      )
    }

    const internProfile = await prisma.internProfile.update({
      where: { id: internId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json({
      message: "Intern approved successfully",
      intern: internProfile,
    })
  } catch (error) {
    console.error("Error approving intern:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
