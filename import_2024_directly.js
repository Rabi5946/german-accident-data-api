import csv from "csv-parser";
import fs from "fs";
import { MongoClient } from "mongodb";

const mongoUrl = "mongodb://localhost:27018/";
const dbName = "accident";
const collectionName = "accidents_2024";

const results = [];

fs.createReadStream("Unfallorte2024_LinRef.csv")
  .pipe(csv({ separator: ";" }))
  .on("data", (row) => {
    const cleanRow = {};
    for (const key in row) {
      cleanRow[key.trim()] = row[key].trim().replace(",", ".");
    }

    results.push({
      accidentId: Number(cleanRow.OID_),

      location: {
        stateCode: Number(cleanRow.ULAND),
        regionCode: Number(cleanRow.UREGBEZ),
        districtCode: Number(cleanRow.UKREIS),
        municipalityCode: Number(cleanRow.UGEMEINDE)
      },

      time: {
        year: Number(cleanRow.UJAHR),
        month: Number(cleanRow.UMONAT),
        hour: Number(cleanRow.USTUNDE),
        weekday: Number(cleanRow.UWOCHENTAG)
      },

      classification: {
        category: Number(cleanRow.UKATEGORIE),
        type: Number(cleanRow.UART),
        typeGroup: Number(cleanRow.UTYP1)
      },

      conditions: {
        light: Number(cleanRow.ULICHTVERH),
        roadCondition: Number(cleanRow.IstStrassenzustand)
      },

      participants: {
        bicycle: Number(cleanRow.IstRad),
        car: Number(cleanRow.IstPKW),
        pedestrian: Number(cleanRow.IstFuss),
        motorcycle: Number(cleanRow.IstKrad),
        truck: Number(cleanRow.IstGkfz),
        other: Number(cleanRow.IstSonstige)
      },
    });
  })
  .on("end", async () => {
    console.log("CSV loaded. Connecting to MongoDB...");

    const client = new MongoClient(mongoUrl);
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    await collection.insertMany(results);

    console.log(`Imported ${results.length} records into ${collectionName}`);
    await client.close();
  });
