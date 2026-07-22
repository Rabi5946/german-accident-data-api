import xlsx from "xlsx";
import { MongoClient } from "mongodb";

//This code import accidents_per_city.xlsx directly to mongodb databases without creating .json file.

async function importExcelToMongo() {
  try {
    // Load Excel file
    const workbook = xlsx.readFile("accidents_per_district.xlsx");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Convert rows to objects
    const docs = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      docs.push({
        key: String(row[0]),
        district: row[1],
        accidents_per_10000: Number(row[2])
      });
    }

    // Connect to MongoDB
    const client = new MongoClient("mongodb://localhost:27018/");
    await client.connect();

    const db = client.db("accident");
    const collection = db.collection("accidents_per_district");

    // Insert data
    await collection.deleteMany({});
    await collection.insertMany(docs);

    console.log("Excel data imported successfully!");
    await client.close();
  } 
  catch (err) {
    console.error("Error:", err);
  }
}

importExcelToMongo();
