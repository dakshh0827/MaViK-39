// backend/prisma/enableEquipmentAuth.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Locking equipment and enabling authentication...");

  // The names/IDs of the equipment you want to lock
  // Note: Ensure these match exactly what is in your database (name or equipmentId)
  const targetIdentifiers = [
    'Laser_Engraver_01', 
    'CNC_Machine_01', 
    'Welding_Station_01', 
    '3D_Printer_01',
    // Adding names from your seed file just in case you haven't renamed them yet:
    'Laser Engraver CO2 LE-100W',
    'CNC VMC 3-Axis Haas VF-2',
    'MIG/CO2 Welding Station 400A',
    'FDM 3D Printer Ultimaker S5'
  ];

  // 1. Find the internal ObjectIds for these equipment items
  const equipmentRecords = await prisma.equipment.findMany({
    where: {
      OR: [
        { equipmentId: { in: targetIdentifiers } },
        { name: { in: targetIdentifiers } }
      ]
    },
    select: { id: true, name: true }
  });

  const objectIds = equipmentRecords.map(eq => eq.id);

  if (objectIds.length === 0) {
    console.log("⚠️ No matching equipment found. Check your equipmentId or name values.");
    return;
  }

  console.log(`found ${objectIds.length} equipment items to update.`);

  // 2. Update Equipment Model (Lock & Auth)
  const equipmentUpdate = await prisma.equipment.updateMany({
    where: {
      id: { in: objectIds },
    },
    data: {
      requiresAuthentication: true,
      isLocked: true,
    },
  });

  // 3. Update EquipmentStatus Model (Reset to IDLE)
  // We use the same 'objectIds' because EquipmentStatus links via equipmentId (ObjectId)
  const statusUpdate = await prisma.equipmentStatus.updateMany({
    where: {
      equipmentId: { in: objectIds },
    },
    data: {
      status: 'IDLE',
      currentOperator: null,
    },
  });

  console.log(`✅ Success!`);
  console.log(`   - Locked ${equipmentUpdate.count} equipment records.`);
  console.log(`   - Reset ${statusUpdate.count} status records.`);
}

main()
  .catch((e) => {
    console.error("❌ Error updating equipment:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });