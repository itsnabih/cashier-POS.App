import { PrismaClient, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Owner account
  const ownerPassword = await bcryptjs.hash("owner123", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@tokobayi.com" },
    update: {},
    create: {
      name: "Owner Toko Bayi",
      email: "owner@tokobayi.com",
      password: ownerPassword,
      role: Role.OWNER,
    },
  });

  // Create Admin account
  const adminPassword = await bcryptjs.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@tokobayi.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@tokobayi.com",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Create Cashier account
  const cashierPassword = await bcryptjs.hash("kasir123", 12);
  const cashier = await prisma.user.upsert({
    where: { email: "kasir@tokobayi.com" },
    update: {},
    create: {
      name: "Kasir 1",
      email: "kasir@tokobayi.com",
      password: cashierPassword,
      role: Role.CASHIER,
    },
  });

  console.log("✅ Users seeded:", { owner: owner.email, admin: admin.email, cashier: cashier.email });

  // Seed sample products
  const products = [
    { name: "Susu Bayi SGM 0-6 Bulan 400g", category: "Susu", sku: "SUS-SGM-001", barcode: "8998866200011", purchasePrice: 45000, sellingPrice: 52000, stock: 25, unit: "box" },
    { name: "Pampers Baby Dry S 36pcs", category: "Popok", sku: "POP-PAM-001", barcode: "4902430890823", purchasePrice: 68000, sellingPrice: 78000, stock: 30, unit: "pack" },
    { name: "Botol Susu Pigeon 120ml", category: "Perlengkapan", sku: "PER-PIG-001", barcode: "4902508131111", purchasePrice: 55000, sellingPrice: 67000, stock: 15, unit: "pcs" },
    { name: "Bedak Bayi Johnson 200g", category: "Perawatan", sku: "PER-JOH-001", barcode: "8999999048501", purchasePrice: 22000, sellingPrice: 28000, stock: 20, unit: "pcs" },
    { name: "Minyak Telon Plus 60ml", category: "Perawatan", sku: "PER-TEL-001", barcode: "8998866105019", purchasePrice: 18000, sellingPrice: 24000, stock: 40, unit: "pcs" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  console.log(`✅ ${products.length} products seeded`);
  console.log("\n📋 Default credentials:");
  console.log("   Owner  : owner@tokobayi.com / owner123");
  console.log("   Admin  : admin@tokobayi.com / admin123");
  console.log("   Kasir  : kasir@tokobayi.com / kasir123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
