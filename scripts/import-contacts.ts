import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const filePath = path.join(__dirname, "contacts.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  const headers = lines[0].split(",");

  const firstNameIdx = headers.findIndex((h) => h.includes("First Name"));
  const middleNameIdx = headers.findIndex((h) => h.includes("Middle Name"));
  const lastNameIdx = headers.findIndex((h) => h.includes("Last Name"));
  const phone1Idx = headers.findIndex((h) => h === "Phone 1 - Value");
  const email1Idx = headers.findIndex((h) => h === "E-mail 1 - Value");
  const orgIdx = headers.findIndex((h) => h === "Organization Name");
  const labelsIdx = headers.findIndex((h) => h === "Labels");

  const clients = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV parsing handling quotes
    const rowStr = lines[i];
    const row = [];
    let insideQuote = false;
    let currentVal = "";
    for (let char of rowStr) {
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        row.push(currentVal);
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    row.push(currentVal);

    if (row.length < 5) continue;

    const fn = row[firstNameIdx] || "";
    const mn = row[middleNameIdx] || "";
    const ln = row[lastNameIdx] || "";
    const name = [fn, mn, ln].filter(Boolean).join(" ");
    
    const phone = row[phone1Idx] ? row[phone1Idx].replace(/"/g, "") : null;
    const email = row[email1Idx] ? row[email1Idx].replace(/"/g, "") : null;
    const company = row[orgIdx] ? row[orgIdx].replace(/"/g, "") : null;
    const labels = row[labelsIdx] ? row[labelsIdx].replace(/"/g, "") : null;

    if (!name && !phone && !email) continue;

    clients.push({
      name: name || "Unknown Contact",
      phone: phone || null,
      email: email || null,
      company: company || null,
      labels: labels || null,
    });
  }

  console.log(`Found ${clients.length} valid contacts to import.`);

  // Chunk inserts
  const CHUNK_SIZE = 50;
  for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
    const chunk = clients.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("am_clients").insert(chunk);
    if (error) {
      console.error("Error inserting chunk:", error.message);
      // Might fail if table doesn't exist yet!
      return;
    }
    console.log(`Inserted chunk ${i / CHUNK_SIZE + 1}`);
  }
  console.log("Import completed!");
}

run();
