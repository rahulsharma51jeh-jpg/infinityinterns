import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      email, 
      password, 
      name, 
      phone,
      college,
      course,
      semester,
      internshipDomain,
      duration,
      startDate,
      endDate
    } = body

    // Validate required fields
    if (!email || !password || !name || !college || !internshipDomain || !duration || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with intern profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "INTERN",
        internProfile: {
          create: {
            phone,
            college,
            course,
            semester,
            internshipDomain,
            duration,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: "PENDING"
          }
        }
      },
      include: {
        internProfile: true
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { 
        message: "Registration successful! Your application is pending approval.",
        user: userWithoutPassword 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
