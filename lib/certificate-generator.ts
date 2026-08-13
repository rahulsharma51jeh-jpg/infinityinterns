import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { format } from 'date-fns'

interface CertificateData {
  internName: string
  college: string
  internshipDomain: string
  duration: string
  startDate: Date
  endDate: Date
  attendance: number
  marksSecured: number
  certificateNo: string
  verificationUrl: string
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  // Create a new PDF document (A4 landscape)
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595]) // A4 landscape dimensions in points
  
  const { width, height } = page.getSize()
  
  // Load fonts
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Draw golden border
  const borderMargin = 20
  const borderWidth = 3
  const cornerSize = 40
  
  // Golden color
  const goldColor = rgb(0.85, 0.65, 0.13)
  
  // Draw outer border
  page.drawRectangle({
    x: borderMargin,
    y: borderMargin,
    width: width - 2 * borderMargin,
    height: height - 2 * borderMargin,
    borderColor: goldColor,
    borderWidth: borderWidth,
  })
  
  // Draw inner border
  const innerMargin = borderMargin + 8
  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: width - 2 * innerMargin,
    height: height - 2 * innerMargin,
    borderColor: goldColor,
    borderWidth: borderWidth,
  })
  
  // Draw corner decorations (simplified)
  const drawCornerDecoration = (x: number, y: number) => {
    page.drawRectangle({
      x: x - 15,
      y: y - 15,
      width: 30,
      height: 30,
      color: goldColor,
      opacity: 0.3,
    })
  }
  
  drawCornerDecoration(borderMargin + 30, height - borderMargin - 30)
  drawCornerDecoration(width - borderMargin - 30, height - borderMargin - 30)
  drawCornerDecoration(borderMargin + 30, borderMargin + 30)
  drawCornerDecoration(width - borderMargin - 30, borderMargin + 30)

  // Header logos position (simplified - you would add actual logo images here)
  const headerY = height - 90
  
  // Left logo placeholder (Infinity Interns logo)
  page.drawRectangle({
    x: 60,
    y: headerY - 30,
    width: 100,
    height: 60,
    borderColor: rgb(0.2, 0.3, 0.7),
    borderWidth: 2,
  })
  page.drawText('INFINITY', {
    x: 70,
    y: headerY - 5,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0.4, 0.8),
  })
  page.drawText('INTERNS', {
    x: 70,
    y: headerY - 20,
    size: 10,
    font: helvetica,
    color: rgb(0.8, 0.1, 0.2),
  })
  
  // Right side government logos placeholder
  page.drawText('Ministry Logos', {
    x: width - 180,
    y: headerY,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  // Title: CERTIFICATE
  const titleY = height - 160
  page.drawText('CERTIFICATE', {
    x: width / 2 - 120,
    y: titleY,
    size: 48,
    font: timesRomanBold,
    color: rgb(0.2, 0.4, 0.8),
  })
  
  // Underline for CERTIFICATE
  page.drawLine({
    start: { x: width / 2 - 150, y: titleY - 5 },
    end: { x: width / 2 + 150, y: titleY - 5 },
    thickness: 2,
    color: rgb(0.2, 0.4, 0.8),
  })
  
  // Subtitle
  page.drawText('OF COMPLETION', {
    x: width / 2 - 85,
    y: titleY - 35,
    size: 24,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })

  // Main content
  let currentY = titleY - 80
  
  // "This is to certify that"
  page.drawText('This is to certify that', {
    x: width / 2 - 80,
    y: currentY,
    size: 14,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 30
  
  // Intern name
  page.drawText(data.internName, {
    x: width / 2 - (data.internName.length * 6),
    y: currentY,
    size: 24,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 25
  
  // "of"
  page.drawText('of', {
    x: width / 2 - 10,
    y: currentY,
    size: 14,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 25
  
  // College name
  const collegeTextWidth = data.college.length * 5
  page.drawText(data.college, {
    x: width / 2 - collegeTextWidth,
    y: currentY,
    size: 18,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 35
  
  // Main description text
  const descLine1 = `has successfully completed a ${data.duration} Online internship training in`
  page.drawText(descLine1, {
    x: width / 2 - (descLine1.length * 3),
    y: currentY,
    size: 12,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 22
  
  // Domain
  page.drawText(data.internshipDomain, {
    x: width / 2 - (data.internshipDomain.length * 5),
    y: currentY,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 25
  
  // Dates
  const startDateStr = format(new Date(data.startDate), 'dd-MM-yyyy')
  const endDateStr = format(new Date(data.endDate), 'dd-MM-yyyy')
  const dateText = `from ${startDateStr} to ${endDateStr} .`
  page.drawText(dateText, {
    x: width / 2 - (dateText.length * 3),
    y: currentY,
    size: 12,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 20
  
  // Performance text
  const perfLine1 = `During this internship, he/she has learned key concepts in above mentioned domain with practical`
  page.drawText(perfLine1, {
    x: width / 2 - (perfLine1.length * 2.5),
    y: currentY,
    size: 10,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 15
  
  const perfLine2 = `assignments and project. The student maintained ${data.attendance}% attendance and secured ${data.marksSecured}% marks`
  page.drawText(perfLine2, {
    x: width / 2 - (perfLine2.length * 2.5),
    y: currentY,
    size: 10,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 15
  
  const perfLine3 = `in the final assessment.`
  page.drawText(perfLine3, {
    x: width / 2 - (perfLine3.length * 2.5),
    y: currentY,
    size: 10,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })
  
  currentY -= 20
  
  const wishText = `We appreciate his/her sincere participation and wish for their best for future opportunities.`
  page.drawText(wishText, {
    x: width / 2 - (wishText.length * 2.5),
    y: currentY,
    size: 10,
    font: timesRoman,
    color: rgb(0, 0, 0),
  })

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    width: 150,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
  
  // Convert base64 QR code to image
  const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(qrImageBytes)
  const qrDims = qrImage.scale(0.5)
  
  // Draw QR code in bottom left
  page.drawImage(qrImage, {
    x: 60,
    y: 60,
    width: qrDims.width,
    height: qrDims.height,
  })
  
  // Verification text under QR
  page.drawText('Verify at', {
    x: 80,
    y: 45,
    size: 8,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })
  page.drawText('infinityinterns.com', {
    x: 65,
    y: 35,
    size: 7,
    font: helvetica,
    color: rgb(0, 0, 0),
  })

  // Footer certifications
  const footerY = 100
  page.drawText('(AICTE Approved and ISO Certified Platform)', {
    x: width / 2 - 120,
    y: footerY,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  })
  
  // Director signature placeholder (right side)
  page.drawText('Infinitya1 Career Counselling', {
    x: width - 260,
    y: footerY + 40,
    size: 10,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })
  page.drawText('Private Limited', {
    x: width - 240,
    y: footerY + 25,
    size: 9,
    font: helvetica,
    color: rgb(0, 0, 0),
  })
  page.drawText('Director', {
    x: width - 200,
    y: footerY + 5,
    size: 10,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })
  
  // Certificate number (bottom right corner)
  page.drawText(`Certificate No: ${data.certificateNo}`, {
    x: width - 220,
    y: 40,
    size: 8,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Save the PDF
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export function generateCertificateNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `II-${timestamp}-${random}`
}
