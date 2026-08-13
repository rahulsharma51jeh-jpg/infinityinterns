import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
    })

    return NextResponse.json({ certificate })
  } catch (error) {
    console.error("Error fetching certificate:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
