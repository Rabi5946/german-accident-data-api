import xlsx from "xlsx";
import { MongoClient } from "mongodb";

// MongoDB connection
const mongoUrl = "mongodb://localhost:27018/";
const dbName = "accident";
const collectionName = "accidents_stats";

// Load workbook
const workbook = xlsx.readFile("accidents_stats.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert sheet to JSON (raw rows)
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// English mapping
const categoryMap = {
  "Unfälle mit Personenschaden": "accidents_with_injuries",
  "Schwerwiegende Unfälle mit Sachschaden i.e.S": "serious_property_damage",
  "Sonst. Unfälle unter dem Einfluss berausch. Mittel": "intoxication_related",
  "Übrige Sachschadensunfälle": "other_property_damage",
  "Insgesamt": "total"
};

const locationMap = {
  "innerorts": "urban",
  "außerorts (ohne Autobahnen)": "rural",
  "auf Autobahnen": "motorway",
  "Insgesamt": "total"
};

// Extract years from header row (row 0)
const years = rows[0].slice(2);

let results = [];
let currentCategory = null;

// Loop through rows starting from row 1
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  const categoryCell = row[0];
  const locationCell = row[1];

  // Detect category rows
  if (categoryMap[categoryCell]) {
    currentCategory = categoryMap[categoryCell];
  }

  // Detect location rows
  if (locationMap[locationCell]) {
    const location = locationMap[locationCell];

    // Loop through year columns
    for (let y = 0; y < years.length; y++) {
      const year = Number(years[y]);
      const count = Number(row[y + 2]);

      results.push({
        category: currentCategory,
        location: location,
        year: year,
        count: count
      });
    }
  }
}

// Insert directly into MongoDB
async function importToMongo() {
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log("Connected to MongoDB (27018)");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Clear old data (optional)
    await collection.deleteMany({});

    // Insert new data
    await collection.insertMany(results);

    console.log(`Successfully imported ${results.length} documents into ${collectionName}`);
  } catch (err) {
    console.error("Error importing data:", err);
  } finally {
    await client.close();
  }
}

importToMongo();
