import xlsx from "xlsx";
import { MongoClient } from "mongodb";

const EXCEL_FILE = "./municipality.xlsx";
const MONGO_URI = "mongodb://localhost:27018/";
const DB_NAME = "accident";
const COLLECTION_NAME = "municipality";

async function importMunicipalities() {
  try {
    // 1. Read Excel file
    const workbook = xlsx.readFile(EXCEL_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert to JSON using first row as header
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const documents = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (!row || row.length < 2) continue;

      const AGS = String(row[0]).trim();
      const municipality = String(row[1]).trim();

      // Skip invalid rows
      if (!/^\d{8}$/.test(AGS)) continue;
      if (!municipality || municipality === "undefined") continue;

      documents.push({ AGS, municipality });
    }

    if (documents.length === 0) {
      console.log("No valid municipality rows found.");
      return;
    }

    // 2. Connect to MongoDB
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // 3. Clear old data
    await collection.deleteMany({});

    // 4. Insert new data
    await collection.insertMany(documents);

    console.log(`Successfully imported ${documents.length} municipalities.`);
    await client.close();
  } catch (err) {
    console.error("Error importing municipalities:", err);
  }
}

importMunicipalities();
