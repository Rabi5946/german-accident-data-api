import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27018");

async function insertAllMetadata() {
  try {
    await client.connect();
    const db = client.db("accident");

    // 1. Clear the collection first (remove all documents)
    await db.collection("dataset_metadata").deleteMany({});
    console.log("✔ Cleared dataset_metadata collection");

    // 2. Prepare metadata
    const metadata = [
      {
        dataset: "accidents_2023",
        source:
          "Unfallatlas – Statistical Offices of the Federation and the Länder",
        source_url:
          "https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/",
        license: "DL-DE-BY-2.0",
        license_url: "https://www.govdata.de/dl-de/by-2-0",
        attribution:
          "Source: Statistical Offices of the Federation and the Länder, Unfallatlas",
      },
      {
        dataset: "accidents_2024",
        source:
          "Unfallatlas – Statistical Offices of the Federation and the Länder",
        source_url:
          "https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/",
        license: "DL-DE-BY-2.0",
        license_url: "https://www.govdata.de/dl-de/by-2-0",
        attribution:
          "Source: Statistical Offices of the Federation and the Länder, Unfallatlas",
      },
      {
        dataset: "municipality",
        source:
          "Statistical Offices of the Federation and the Länder – Address Directory",
        source_url:
          "https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis",
        license: "Free to use with attribution",
        license_url: null,
        attribution:
          "Source: Statistical Offices of the Federation and the Länder, Address Directory (as of 31.01.2026)",
      },
      {
        dataset: "accidents_per_district",
        source: "Professorship of Data Management, TU Chemnitz (OPAL)",
        source_url: null,
        license: "Academic use only",
        license_url: null,
        attribution:
          "Provided by the Professorship of Data Management, TU Chemnitz",
      },
      {
        dataset: "accidents_stats",
        source: "Professorship of Data Management, TU Chemnitz (OPAL)",
        source_url: null,
        license: "Academic use only",
        license_url: null,
        attribution:
          "Provided by the Professorship of Data Management, TU Chemnitz",
      },
    ];

    // 3. Insert fresh metadata (no duplicates possible)
    await db.collection("dataset_metadata").insertMany(metadata);

    console.log("✔ Inserted fresh metadata (exactly 5 items)");
  } catch (err) {
    console.error("Error inserting metadata:", err);
  } finally {
    await client.close();
  }
}

insertAllMetadata();
