// backend/prisma/seedStudents.js
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Helper: Hash biometric data (SHA-256)
const hashBiometric = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

async function main() {
  console.log("🌱 Starting Student Seed...");

  // 1. Find the specific Lab used for the Firebase Demo
  // In seed.js, labId is constructed as: `${instituteId}_${department}_LAB_${labNum}`
  const targetLabId = "ITI_JAIPUR_ADVANCED_MANUFACTURING_CNC_LAB_1";

  console.log(`🔍 Looking for target Lab ID: ${targetLabId}...`);

  const lab = await prisma.lab.findUnique({
    where: { labId: targetLabId },
    include: {
      institute: true
    }
  });

  if (!lab) {
    console.error(`❌ Lab with ID '${targetLabId}' not found.`);
    console.log("⚠️ Please run 'node prisma/seed.js' first to populate institutes and labs.");
    return;
  }

  console.log(`✅ Found Lab: ${lab.name}`);
  console.log(`   Institute: ${lab.institute.name}`);

  // 2. Define Student Data
  const STUDENTS_DATA = [
    {
      firstName: "Rahul",
      lastName: "Sharma",
      email: "rahul.sharma@student.iti.gov.in",
      phone: "9876543210",
      aadhaarNumber: "123456789012",
      // Simulating a hash of the raw biometric data
      biometricHash: hashBiometric({ 
        id: "fingerprint_1", 
        pattern: "whorl_loop_arch_mixed" 
      }),
      biometricType: "FINGERPRINT",
      aadhaarVerified: true,
      instituteId: lab.instituteId,
      department: lab.department,
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
      biometricHash: hashBiometric({ 
        id: "fingerprint_2", 
        pattern: "loop_arch_mixed_whorl" 
      }),
      biometricType: "FINGERPRINT",
      aadhaarVerified: true,
      instituteId: lab.instituteId,
      department: lab.department,
      labId: lab.id,
      enrollmentNumber: "ITI2024/CNC/002",
      courseType: "DIPLOMA",
      batchYear: "2024",
    },
    {
      firstName: "Amit",
      lastName: "Verma",
      email: "amit.verma@student.iti.gov.in",
      phone: "9876543212",
      aadhaarNumber: "123456789014",
      biometricHash: hashBiometric({ 
        id: "fingerprint_3", 
        pattern: "arch_whorl_loop_mixed" 
      }),
      biometricType: "FINGERPRINT",
      aadhaarVerified: true,
      instituteId: lab.instituteId,
      department: lab.department,
      labId: lab.id,
      enrollmentNumber: "ITI2024/CNC/003",
      courseType: "DIPLOMA",
      batchYear: "2024",
    }
  ];

  // 3. Create Students
  console.log("\n🎓 Creating/Updating Students...");
  
  for (const student of STUDENTS_DATA) {
    const createdStudent = await prisma.student.upsert({
      where: { aadhaarNumber: student.aadhaarNumber },
      update: student,
      create: student,
    });
    console.log(`  ✓ ${createdStudent.firstName} ${createdStudent.lastName} (Aadhaar: ${createdStudent.aadhaarNumber})`);
  }

  // 4. Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ STUDENT SEED COMPLETED");
  console.log("=".repeat(50));
  console.log(`• Target Lab: ${lab.name}`);
  console.log(`• Total Students: ${STUDENTS_DATA.length}`);
  console.log(`• Department: ${lab.department}`);
  console.log("\nUse these Aadhaar numbers for testing authentication:");
  STUDENTS_DATA.forEach(s => console.log(` - ${s.firstName}: ${s.aadhaarNumber}`));
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("\n❌ SEED FAILED:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });