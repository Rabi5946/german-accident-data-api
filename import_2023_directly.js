import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

const fileName = "Unfallorte2023_LinRef.csv";
const mongoUrl = "mongodb://localhost:27018/";
const dbName = "accident";

// Convert German decimal comma → dot
const fixNumber = (value) => {
  if (!value) return null;
  return value.replace(",", ".").trim();
};

// Parse one accident row into nested structure
function mapAccidentRow(headers, values) {
  const get = (name) => values[headers.indexOf(name)];

  return {
    accidentId: Number(get("OID_")),

    location: {
      stateCode: Number(get("ULAND")),
      regionCode: Number(get("UREGBEZ")),
      districtCode: Number(get("UKREIS")),
      municipalityCode: Number(get("UGEMEINDE"))
    },

    time: {
      year: Number(get("UJAHR")),
      month: Number(get("UMONAT")),
      hour: Number(get("USTUNDE")),
      weekday: Number(get("UWOCHENTAG"))
    },

    classification: {
      category: Number(get("UKATEGORIE")),
      type: Number(get("UART")),
      typeGroup: Number(get("UTYP1"))
    },

    conditions: {
      light: Number(get("ULICHTVERH")),
      roadCondition: Number(get("IstStrassenzustand"))
    },

    participants: {
      bicycle: Number(get("IstRad")),
      car: Number(get("IstPKW")),
      pedestrian: Number(get("IstFuss")),
      motorcycle: Number(get("IstKrad")),
      truck: Number(get("IstGkfz")),
      other: Number(get("IstSonstige"))
    },

  };
}

// Parse the 2023 file
function parseAccidentFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter(Boolean);

  const separator = ";";
  const headers = lines[0].split(separator).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim());
    return mapAccidentRow(headers, values);
  });
}

async function run() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);

  const filePath = path.join("./", fileName);

  console.log(`Reading ${fileName}...`);
  const jsonData = parseAccidentFile(filePath);

  console.log(`Parsed ${jsonData.length} accident records.`);

  const collection = db.collection("accidents_2023");

  await collection.deleteMany({});
  await collection.insertMany(jsonData);

  console.log(`Inserted ${jsonData.length} records into MongoDB collection: accidents_2023`);

  await client.close();
  console.log("Done.");
}

run().catch(err => console.error(err));
