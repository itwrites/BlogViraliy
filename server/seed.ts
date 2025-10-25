import bcrypt from "bcrypt";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // Create default admin user
  const existingAdmin = await storage.getUserByUsername("admin");
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
    });
    console.log("✓ Created default admin user (username: admin, password: admin123)");
  } else {
    console.log("✓ Admin user already exists");
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
