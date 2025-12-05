// backend/prisma/seed.js - COMPLETE WITH REAL NAMES & CREDENTIALS
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =================== UNIVERSAL PASSWORD ===================
const UNIVERSAL_PASSWORD = "Test@123";

// =================== FIREBASE DEVICE IDS ===================
const FIREBASE_DEVICE_IDS = [
  "User1", "User2", "User3", "User4", "User5",
  "User6", "User7", "User8", "User9"
];

// =================== INSTITUTES DATA ===================
const INSTITUTES_DATA = [
  {
    instituteId: "ITI_JAIPUR",
    name: "Government ITI Jaipur",
  },
  {
    instituteId: "ITI_KHO_NAGORIYAN",
    name: "Government ITI Kho Nagoriyan",
  },
  {
    instituteId: "GURUKUL_ITI",
    name: "Gurukul ITI Jaipur",
  },
  {
    instituteId: "BHAWANI_NIKETAN",
    name: "Shri Bhawani Niketan ITI",
  },
  {
    instituteId: "BSDU",
    name: "Bhartiya Skill Development University",
  },
];

// =================== DEPARTMENTS ===================
const DEPARTMENTS = [
  "FITTER_MANUFACTURING",
  "ELECTRICAL_ENGINEERING",
  "WELDING_FABRICATION",
  "TOOL_DIE_MAKING",
  "ADDITIVE_MANUFACTURING",
  "SOLAR_INSTALLER_PV",
  "MATERIAL_TESTING_QUALITY",
  "ADVANCED_MANUFACTURING_CNC",
  "AUTOMOTIVE_MECHANIC",
];

// =================== USERS DATA ===================
const POLICY_MAKERS = [
  {
    email: "rajesh.kumar@education.gov.in",
    firstName: "Rajesh",
    lastName: "Kumar"
  },
  {
    email: "priya.sharma@education.gov.in",
    firstName: "Priya",
    lastName: "Sharma"
  }
];

const LAB_MANAGERS = [
  {
    email: "amit.verma@itijaipur.edu.in",
    firstName: "Amit",
    lastName: "Verma",
    instituteIndex: 0 // ITI Jaipur
  },
  {
    email: "sunita.patel@itijaipur.edu.in",
    firstName: "Sunita",
    lastName: "Patel",
    instituteIndex: 0 // ITI Jaipur
  },
  {
    email: "vijay.singh@itikho.edu.in",
    firstName: "Vijay",
    lastName: "Singh",
    instituteIndex: 1 // ITI Kho Nagoriyan
  },
  {
    email: "kavita.mehta@gurukul.edu.in",
    firstName: "Kavita",
    lastName: "Mehta",
    instituteIndex: 2 // Gurukul ITI
  }
];

const TRAINERS = [
  { email: "ramesh.yadav@trainer.edu.in", firstName: "Ramesh", lastName: "Yadav" },
  { email: "neha.gupta@trainer.edu.in", firstName: "Neha", lastName: "Gupta" },
  { email: "suresh.reddy@trainer.edu.in", firstName: "Suresh", lastName: "Reddy" },
  { email: "anita.desai@trainer.edu.in", firstName: "Anita", lastName: "Desai" },
  { email: "manoj.joshi@trainer.edu.in", firstName: "Manoj", lastName: "Joshi" },
  { email: "deepa.nair@trainer.edu.in", firstName: "Deepa", lastName: "Nair" },
  { email: "rakesh.pandey@trainer.edu.in", firstName: "Rakesh", lastName: "Pandey" },
  { email: "pooja.saxena@trainer.edu.in", firstName: "Pooja", lastName: "Saxena" },
  { email: "arun.menon@trainer.edu.in", firstName: "Arun", lastName: "Menon" },
  { email: "swati.jain@trainer.edu.in", firstName: "Swati", lastName: "Jain" },
  { email: "kiran.bose@trainer.edu.in", firstName: "Kiran", lastName: "Bose" },
  { email: "gaurav.kapoor@trainer.edu.in", firstName: "Gaurav", lastName: "Kapoor" }
];

// =================== EQUIPMENT NAMES ===================
const EQUIPMENT_NAMES = {
  FITTER_MANUFACTURING: [
    "Bench Drilling Machine Model BD-450",
    "Angle Grinder AG-2000 Professional",
    "Arc Welding Station ARC-300",
    "Gas Welding Setup OXY-AC-100",
    "MIG Welder Unit MIG-250",
    "Precision Bench Vice BV-6",
    "Hydraulic Press HP-20T",
  ],
  ELECTRICAL_ENGINEERING: [
    "Electrician Training Panel ETP-5000",
    "PLC & VFD Advanced System",
    "Digital Multimeter Station DMS-10",
    "Oscilloscope Unit OSC-100MHz",
    "Power Supply Module PSM-30V",
    "Circuit Analysis Board CAB-Pro",
    "Motor Control Panel MCP-3Ph",
  ],
  WELDING_FABRICATION: [
    "Arc Welding Machine 200-300A",
    "Oxy-Acetylene Welding Kit Premium",
    "MIG/CO2 Welding Station 400A",
    "VR Welding Simulator WeldSim-Pro",
    "Plasma Cutting System PCS-50",
    "Fume Extraction Unit FEU-5000",
    "TIG Welding Machine TIG-200AC/DC",
  ],
  TOOL_DIE_MAKING: [
    "EDM Machine Electrical Discharge",
    "CNC Jig Boring Machine JB-2000",
    "Surface Grinder SG-500",
    "Tool & Cutter Grinder TCG-350",
    "Wire EDM Machine WEDM-300",
    "Precision Lathe PL-600",
    "Milling Machine Universal Mill-5",
  ],
  ADDITIVE_MANUFACTURING: [
    "FDM 3D Printer Ultimaker S5",
    "Resin 3D Printer Formlabs 3+",
    "Laser Engraver CO2 LE-100W",
    "CNC Laser Cutter LC-150W",
    "Post-Curing Station UV-Chamber",
    "Filament Dryer FD-Pro",
    "3D Scanner Handheld HS-2000",
  ],
  SOLAR_INSTALLER_PV: [
    "Solar Inverter Training Unit 5kW",
    "PV Panel Testing Station PVTS-10",
    "Battery Bank Simulator 48V-200Ah",
    "Solar Irradiance Meter SIM-2000",
    "Installation Tool Kit Professional",
    "Charge Controller Testing Unit",
    "Grid Tie System Simulator GTSS-5",
  ],
  MATERIAL_TESTING_QUALITY: [
    "Universal Testing Machine UTM-100kN",
    "Compression Testing Machine CTM-2000",
    "Charpy Impact Tester CIT-300J",
    "Rockwell Hardness Tester RHT-Pro",
    "Brinell Hardness Tester BHT-3000",
    "Optical Comparator OC-400",
    "Environmental Test Chamber ETC-1000L",
    "Metallurgical Microscope MM-5000",
  ],
  ADVANCED_MANUFACTURING_CNC: [
    "CNC VMC 3-Axis Haas VF-2",
    "CNC VMC 4-Axis DMG Mori",
    "CNC Lathe 2-Axis Mazak QuickTurn",
    "CNC Lathe with Live Tools",
    "CNC Router 5-Axis AXYZ",
    "CNC Plasma Cutter Hypertherm",
    "CAD/CAM Workstation Pro-1",
    "CAD/CAM Workstation Pro-2",
    "Tool Presetter Digital TP-3000",
  ],
  AUTOMOTIVE_MECHANIC: [
    "Petrol Engine Training Model 4-Cyl",
    "Diesel Engine Test Bench 6-Cyl",
    "Transmission Training Unit Manual",
    "Automatic Transmission Simulator",
    "Brake System Hydraulic Trainer",
    "Electrical System Training Board",
    "AC System Trainer R134a",
    "Suspension & Steering Trainer",
  ],
};

const MANUFACTURERS = [
  "Siemens AG", "Robert Bosch GmbH", "ABB Ltd", "Schneider Electric",
  "FANUC Corporation", "Haas Automation", "DMG Mori", "Mazak Corporation",
  "Makino Milling", "Okuma Corporation", "Mitsubishi Electric",
  "Yaskawa Electric", "Delta Electronics", "Omron Corporation"
];

const STATUSES = ["OPERATIONAL", "IN_USE", "IDLE", "MAINTENANCE"];

const MAINTENANCE_TYPES = [
  "Preventive Maintenance",
  "Corrective Maintenance", 
  "Calibration",
  "Inspection",
  "Cleaning",
  "Parts Replacement"
];

async function main() {
  console.log("🌱 Starting seed with real names and credentials...");
  console.log("🔐 Universal Password: " + UNIVERSAL_PASSWORD);
  console.log("");

  // =================== CLEAN EXISTING DATA ===================
  console.log("🧹 Cleaning existing data...");
  await prisma.maintenanceRecord.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.sensorData.deleteMany();
  await prisma.departmentAnalytics.deleteMany();
  await prisma.equipmentStatus.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.institute.deleteMany();

  // =================== CREATE INSTITUTES ===================
  console.log("🏢 Creating institutes...");
  const institutes = [];
  for (const inst of INSTITUTES_DATA) {
    const institute = await prisma.institute.create({ data: inst });
    institutes.push(institute);
    console.log(`  ✓ ${institute.name}`);
  }

  // =================== CREATE LABS ===================
  console.log("\n🔬 Creating labs...");
  const labs = [];
  for (let i = 0; i < institutes.length; i++) {
    const institute = institutes[i];
    for (let j = 0; j < 3; j++) {
      const deptIndex = (i * 3 + j) % DEPARTMENTS.length;
      const department = DEPARTMENTS[deptIndex];
      const lab = await prisma.lab.create({
        data: {
          labId: `${institute.instituteId}_LAB_${j + 1}`,
          name: `${institute.name} - ${department.replace(/_/g, " ")} Lab ${j + 1}`,
          instituteId: institute.instituteId,
          department,
        },
      });
      labs.push(lab);
      console.log(`  ✓ ${lab.name}`);
    }
  }

  // =================== CREATE USERS ===================
  const hashedPassword = await bcrypt.hash(UNIVERSAL_PASSWORD, 10);
  
  // Policy Makers
  console.log("\n👔 Creating Policy Makers...");
  const policyMakers = [];
  for (const pm of POLICY_MAKERS) {
    const user = await prisma.user.create({
      data: {
        email: pm.email,
        password: hashedPassword,
        firstName: pm.firstName,
        lastName: pm.lastName,
        role: "POLICY_MAKER",
        emailVerified: true,
        isActive: true,
      },
    });
    policyMakers.push(user);
    console.log(`  ✓ ${user.firstName} ${user.lastName} - ${user.email}`);
  }

  // Lab Managers
  console.log("\n👨‍💼 Creating Lab Managers...");
  const labManagers = [];
  for (const lm of LAB_MANAGERS) {
    const institute = institutes[lm.instituteIndex];
    const lab = labs.find(l => l.instituteId === institute.instituteId);
    const user = await prisma.user.create({
      data: {
        email: lm.email,
        password: hashedPassword,
        firstName: lm.firstName,
        lastName: lm.lastName,
        role: "LAB_MANAGER",
        department: lab.department,
        instituteId: institute.instituteId,
        labId: lab.id,
        emailVerified: true,
        isActive: true,
      },
    });
    labManagers.push(user);
    console.log(`  ✓ ${user.firstName} ${user.lastName} - ${user.email} (${institute.name})`);
  }

  // Trainers
  console.log("\n👨‍🏫 Creating Trainers...");
  const trainers = [];
  let trainerIndex = 0;
  for (let labIndex = 0; labIndex < labs.length && trainerIndex < TRAINERS.length; labIndex++) {
    const lab = labs[labIndex];
    const numTrainers = labIndex % 3 === 0 ? 3 : 2;
    
    for (let i = 0; i < numTrainers && trainerIndex < TRAINERS.length; i++) {
      const trainerData = TRAINERS[trainerIndex];
      const user = await prisma.user.create({
        data: {
          email: trainerData.email,
          password: hashedPassword,
          firstName: trainerData.firstName,
          lastName: trainerData.lastName,
          role: "TRAINER",
          department: lab.department,
          instituteId: lab.instituteId,
          labId: lab.id,
          emailVerified: true,
          isActive: true,
        },
      });
      trainers.push(user);
      console.log(`  ✓ ${user.firstName} ${user.lastName} - ${user.email} (${lab.name})`);
      trainerIndex++;
    }
  }

  // =================== CREATE EQUIPMENT ===================
  console.log("\n⚙️ Creating equipment...");
  let equipmentIdCounter = 1;
  let firebaseLabFound = false;
  
  for (const lab of labs) {
    const equipmentNames = EQUIPMENT_NAMES[lab.department] || [];
    const numEquipment = 6 + Math.floor(Math.random() * 4); // 6-9
    
    // Check if this is the Firebase-enabled lab (first ADVANCED_MANUFACTURING_CNC lab)
    const isFirebaseLab = !firebaseLabFound && 
                          lab.department === "ADVANCED_MANUFACTURING_CNC" &&
                          lab.labId.includes("LAB_1");
    
    if (isFirebaseLab) {
      firebaseLabFound = true;
      console.log(`\n  🔥 Firebase-Enabled Lab: ${lab.name}`);
    }
    
    for (let i = 0; i < Math.min(numEquipment, equipmentNames.length); i++) {
      const manufacturer = MANUFACTURERS[Math.floor(Math.random() * MANUFACTURERS.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const healthScore = 70 + Math.floor(Math.random() * 30);
      
      // Assign Firebase device ID only to first 9 equipment in Firebase lab
      const firebaseDeviceId = isFirebaseLab && i < 9 ? FIREBASE_DEVICE_IDS[i] : null;
      
      const equipment = await prisma.equipment.create({
        data: {
          equipmentId: `EQ-${String(equipmentIdCounter).padStart(4, "0")}`,
          name: equipmentNames[i],
          department: lab.department,
          manufacturer,
          model: `${manufacturer.split(" ")[0]}-${1000 + Math.floor(Math.random() * 9000)}`,
          serialNumber: `SN${Date.now()}${equipmentIdCounter}`,
          purchaseDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1),
          warrantyExpiry: new Date(2025 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1),
          labId: lab.id,
          firebaseDeviceId,
          isActive: true,
          status: {
            create: {
              status,
              healthScore,
              temperature: 20 + Math.random() * 40,
              vibration: Math.random() * 5,
              energyConsumption: 100 + Math.random() * 400,
              lastMaintenanceDate: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
            },
          },
          analyticsParams: {
            create: {
              department: lab.department,
              temperature: 20 + Math.random() * 40,
              vibration: Math.random() * 5,
              energyConsumption: 100 + Math.random() * 400,
              efficiency: 75 + Math.random() * 20,
              totalUptime: 100 + Math.random() * 500,
              totalDowntime: Math.random() * 50,
              utilizationRate: 50 + Math.random() * 40,
              voltage: 220 + Math.random() * 20,
              current: 5 + Math.random() * 10,
              powerFactor: 0.85 + Math.random() * 0.1,
            },
          },
        },
      });
      
      // Add historical sensor data
      const now = Date.now();
      for (let hour = 0; hour < 24; hour++) {
        await prisma.sensorData.create({
          data: {
            equipmentId: equipment.id,
            temperature: 20 + Math.random() * 40,
            vibration: Math.random() * 5,
            energyConsumption: 100 + Math.random() * 400,
            timestamp: new Date(now - hour * 60 * 60 * 1000),
          },
        });
      }
      
      // Add maintenance records (60% chance)
      if (Math.random() > 0.4 && labManagers.length > 0) {
        const randomManager = labManagers[Math.floor(Math.random() * labManagers.length)];
        const maintenanceType = MAINTENANCE_TYPES[Math.floor(Math.random() * MAINTENANCE_TYPES.length)];
        
        await prisma.maintenanceRecord.create({
          data: {
            equipmentId: equipment.id,
            markedBy: randomManager.id,
            maintenanceType,
            notes: `${maintenanceType} completed successfully. All systems checked and verified.`,
            maintenanceDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
          },
        });
      }
      
      if (firebaseDeviceId) {
        console.log(`    🔥 ${equipment.name} → Firebase: ${firebaseDeviceId}`);
      }
      
      equipmentIdCounter++;
    }
    
    console.log(`  ✓ ${lab.name}: ${Math.min(numEquipment, equipmentNames.length)} equipment created`);
  }

  // =================== SUMMARY ===================
  console.log("\n" + "=".repeat(80));
  console.log("✅ SEED COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(80));
  
  console.log("\n📊 DATABASE SUMMARY:");
  console.log(`  • ${institutes.length} Institutes`);
  console.log(`  • ${labs.length} Labs`);
  console.log(`  • ${policyMakers.length} Policy Makers`);
  console.log(`  • ${labManagers.length} Lab Managers`);
  console.log(`  • ${trainers.length} Trainers`);
  console.log(`  • ${equipmentIdCounter - 1} Equipment (9 with Firebase tracking)`);
  
  console.log("\n🔐 LOGIN CREDENTIALS:");
  console.log("  Universal Password: " + UNIVERSAL_PASSWORD);
  console.log("");
  
  console.log("  📋 POLICY MAKERS:");
  policyMakers.forEach(pm => {
    console.log(`    • ${pm.email}`);
  });
  
  console.log("\n  📋 LAB MANAGERS:");
  labManagers.forEach(lm => {
    console.log(`    • ${lm.email}`);
  });
  
  console.log("\n  📋 TRAINERS (showing first 5):");
  trainers.slice(0, 5).forEach(t => {
    console.log(`    • ${t.email}`);
  });
  console.log(`    ... and ${trainers.length - 5} more`);
  
  console.log("\n🔥 FIREBASE INTEGRATION:");
  console.log(`  • Lab: ${labs.find(l => l.department === "ADVANCED_MANUFACTURING_CNC" && l.labId.includes("LAB_1"))?.name}`);
  console.log(`  • Device IDs: ${FIREBASE_DEVICE_IDS.join(", ")}`);
  
  console.log("\n" + "=".repeat(80));
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