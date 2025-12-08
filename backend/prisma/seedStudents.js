import prisma from "../config/database.js";
import crypto from "crypto";

const hashBiometric = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

async function seedStudents() {
  const lab = await prisma.lab.findFirst({
    where: {
      institute: { instituteId: "ITI_JAIPUR" },
      department: "ADVANCED_MANUFACTURING_CNC",
      name: "Lab 1",
    },
  });

  if (!lab) {
    console.error("Lab not found");
    return;
  }

  const students = [
    {
      firstName: "Rahul",
      lastName: "Sharma",
      email: "rahul.sharma@student.iti.gov.in",
      phone: "9876543210",
      aadhaarNumber: "123456789012",
      biometricHash: hashBiometric({ fingerprint: "mock_template_1" }),
      instituteId: "ITI_JAIPUR",
      department: "ADVANCED_MANUFACTURING_CNC",
      labId: lab.id,
      enrollmentNumber: "ITI2024/CNC/001",
      courseType: "DIPLOMA",
      batchYear: "2024",
    },
    {
      firstName: "Priya",
      lastName: "Singh",
      email: "priya.singh@student.iti.gov.in",
      phone: "9876543211",
      aadhaarNumber: "123456789013",
      biometricHash: hashBiometric({ fingerprint: "mock_template_2" }),
      instituteId: "ITI_JAIPUR",
      department: "ADVANCED_MANUFACTURING_CNC",
      labId: lab.id,
      enrollmentNumber: "ITI2024/CNC/002",
      courseType: "DIPLOMA",
      batchYear: "2024",
    },
  ];

  for (const student of students) {
    await prisma.student.create({ data: student });
  }

  console.log("✅ Students seeded successfully");
}

seedStudents();