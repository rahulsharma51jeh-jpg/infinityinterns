import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCertificatePDF, generateCertificateNumber } from "@/lib/certificate-generator"
import QRCode from 'qrcode'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    // Fetch intern profile with all necessary data
    const internProfile = await prisma.internProfile.findUnique({
      where: { id: internId },
      include: {
        user: true,
      },
    })

    if (!internProfile) {
      return NextResponse.json(
        { error: "Intern not found" },
        { status: 404 }
      )
    }

    // Verify intern is approved
    if (internProfile.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Intern must be approved before generating certificate" },
        { status: 400 }
      )
    }

    // Verify metrics are set
    if (internProfile.attendance === null || internProfile.marksSecured === null) {
      return NextResponse.json(
        { error: "Attendance and marks must be set before generating certificate" },
        { status: 400 }
      )
    }

    // Check if certificate already exists for this user
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        userId: internProfile.userId,
        isActive: true,
      },
    })

    if (existingCertificate) {
      return NextResponse.json(
        { error: "Certificate already exists for this intern", certificateNo: existingCertificate.certificateNo },
        { status: 400 }
      )
    }

    // Generate unique certificate number
    const certificateNo = generateCertificateNumber()
    
    // Create verification URL
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify/${certificateNo}`

    // Generate QR code as base64
    const qrCodeData = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
    })

    // Prepare certificate data
    const certificateData = {
      internName: internProfile.user.name,
      college: internProfile.college,
      internshipDomain: internProfile.internshipDomain,
      duration: internProfile.duration,
      startDate: internProfile.startDate,
      endDate: internProfile.endDate,
      attendance: internProfile.attendance,
      marksSecured: internProfile.marksSecured,
      certificateNo,
      verificationUrl,
    }

    // Generate PDF certificate
    const pdfBuffer = await generateCertificatePDF(certificateData)

    // Ensure certificates directory exists
    const certificatesDir = path.join(process.cwd(), 'public', 'certificates')
    await mkdir(certificatesDir, { recursive: true })

    // Save PDF to file system
    const pdfFilename = `${certificateNo}.pdf`
    const pdfPath = path.join(certificatesDir, pdfFilename)
    await writeFile(pdfPath, pdfBuffer)

    // Save certificate to database
    const certificate = await prisma.certificate.create({
      data: {
        certificateNo,
        userId: internProfile.userId,
        internName: internProfile.user.name,
        college: internProfile.college,
        internshipDomain: internProfile.internshipDomain,
        duration: internProfile.duration,
        startDate: internProfile.startDate,
        endDate: internProfile.endDate,
        attendance: internProfile.attendance,
        marksSecured: internProfile.marksSecured,
        qrCodeData,
        verificationUrl,
        pdfUrl: `/certificates/${pdfFilename}`,
      },
    })

    // Update intern profile status to COMPLETED
    await prisma.internProfile.update({
      where: { id: internId },
      data: {
        status: "COMPLETED",
      },
    })

    return NextResponse.json({
      message: "Certificate generated successfully",
      certificateNo: certificate.certificateNo,
      pdfUrl: certificate.pdfUrl,
      verificationUrl: certificate.verificationUrl,
    })
  } catch (error) {
    console.error("Error generating certificate:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
