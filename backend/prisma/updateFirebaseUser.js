// backend/prisma/updateFirebaseIds.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Updating Firebase Device IDs...");

  // Mapping old → new device IDs
  const updates = {
    "User1": "kYPlFQo91cSw3bw0fLFFt1a1rUC2"
  };

  for (const oldId in updates) {
    const newId = updates[oldId];

    console.log(`\n➡️ Updating ${oldId} → ${newId}`);

    const updated = await prisma.equipment.updateMany({
      where: { firebaseDeviceId: oldId },
      data: { firebaseDeviceId: newId }
    });

    console.log(`   ✓ Updated ${updated.count} records`);
  }

  console.log("\n✅ Firebase Device IDs Updated Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error updating Firebase IDs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
