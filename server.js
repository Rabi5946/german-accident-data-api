import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import { buildQuery } from "./utils/buildQuery.js";
import { swaggerSpec, swaggerUiMiddleware } from "./swagger.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  "/api-docs",
  swaggerUiMiddleware.serve,
  swaggerUiMiddleware.setup(swaggerSpec),
);

// -------------------------
// MongoDB Connection
// -------------------------
const client = new MongoClient("mongodb://localhost:27018/");
await client.connect();

const db = client.db("accident"); // database name
const accidents_stats = db.collection("accidents_stats"); // collection 1
const accidents_per_district = db.collection("accidents_per_district"); //collection 2
const accidentCollections = ["accidents_2023", "accidents_2024"];

// -------------------------
// Metadata Helpers
// -------------------------

async function getMetadata(db, datasets) {
  return await db
    .collection("dataset_metadata")
    .find({ dataset: { $in: datasets } })
    .toArray();
}

async function sendWithMetadata(res, db, datasets, data) {
  const metadata = await getMetadata(db, datasets);
  res.json({ data, metadata });
}

//it helps to convert state name to code
const stateNameToCode = {
  "schleswig-holstein": 1,
  hamburg: 2,
  niedersachsen: 3,
  bremen: 4,
  "nordrhein-westfalen": 5,
  hessen: 6,
  "rheinland-pfalz": 7,
  "baden-württemberg": 8,
  "baden-wurttemberg": 8, // fallback without umlaut
  bayern: 9,
  saarland: 10,
  berlin: 11,
  brandenburg: 12,
  "mecklenburg-vorpommern": 13,
  "mecklenburg vorpommern": 13, // fallback
  sachsen: 14,
  "sachsen-anhalt": 15,
  "sachsen anhalt": 15, // fallback
  thüringen: 16,
  thuringen: 16, // fallback without umlaut
};

//it helps to convert code to statename
const codeToStateName = {
  1: "Schleswig-Holstein",
  2: "Hamburg",
  3: "Niedersachsen",
  4: "Bremen",
  5: "Nordrhein-Westfalen",
  6: "Hessen",
  7: "Rheinland-Pfalz",
  8: "Baden-Württemberg",
  9: "Bayern",
  10: "Saarland",
  11: "Berlin",
  12: "Brandenburg",
  13: "Mecklenburg-Vorpommern",
  14: "Sachsen",
  15: "Sachsen-Anhalt",
  16: "Thüringen",
};

/**
 * @openapi
 * /api/accidents:
 *   get:
 *     tags:
 *       - Accidents
 *     summary: Search accidents of 2023 and 2024 using dynamic filters
 *     description: |
 *       This endpoint searches accident datasets 2023 and 2024 collections.
 *       You can filter by state name, stateCode, districtCode, municipalityCode, year, month, hour, weekday,
 *       accident classification, road conditions, and participant types.
 *
 *       Example:
 *       `/api/accidents?state=berlin&car=1&bicycle=1&year=2023`
 *
 *     parameters:
 *       - in: query
 *         name: accidentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: stateCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: regionCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: districtCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: municipalityCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: hour
 *         schema:
 *           type: integer
 *       - in: query
 *         name: weekday
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *       - in: query
 *         name: typeGroup
 *         schema:
 *           type: integer
 *       - in: query
 *         name: light
 *         schema:
 *           type: integer
 *       - in: query
 *         name: roadCondition
 *         schema:
 *           type: integer
 *       - in: query
 *         name: bicycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: car
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pedestrian
 *         schema:
 *           type: integer
 *       - in: query
 *         name: motorcycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: truck
 *         schema:
 *           type: integer
 *       - in: query
 *         name: other
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: List of accidents matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Accident'
 *       500:
 *         description: Server error
 */

app.get("/api/accidents", async (req, res) => {
  try {
    const query = buildQuery(req, stateNameToCode);

    let results = [];

    const year = req.query.year ? Number(req.query.year) : null;

    let usedCollections = [];

    if (year) {
      usedCollections = [`accidents_${year}`];
    } else {
      usedCollections = accidentCollections; 
    }

    for (const col of usedCollections) {
      const data = await db.collection(col).find(query).limit(100).toArray();
      results = results.concat(data);
    }

    
    // res.json(results);
    await sendWithMetadata(res, db, usedCollections, {
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/accidents/count:
 *   get:
 *     tags:
 *       - Accidents
 *     summary: Count accidents of 2023 and 2024 using dynamic filters
 *     description: |
 *       Returns the total number of accidents that match the given filters.
 *       This endpoint count the number of accidents of year 2023 and 2024.
 *
 *       Example:
 *       `/api/accidents/count?state=berlin&car=1`
 *
 *     parameters:
 *       - in: query
 *         name: accidentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: stateCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: regionCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: districtCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: municipalityCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: hour
 *         schema:
 *           type: integer
 *       - in: query
 *         name: weekday
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *       - in: query
 *         name: typeGroup
 *         schema:
 *           type: integer
 *       - in: query
 *         name: light
 *         schema:
 *           type: integer
 *       - in: query
 *         name: roadCondition
 *         schema:
 *           type: integer
 *       - in: query
 *         name: bicycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: car
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pedestrian
 *         schema:
 *           type: integer
 *       - in: query
 *         name: motorcycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: truck
 *         schema:
 *           type: integer
 *       - in: query
 *         name: other
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: Total number of accidents matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 152
 *       500:
 *         description: Server error
 */

//localhost:3000/api/accidents/count?state=berlin&car=1
app.get("/api/accidents/count", async (req, res) => {
  try {
    const query = buildQuery(req, stateNameToCode);

    let total = 0;

    const year = req.query.year ? Number(req.query.year) : null;

    let usedCollections = [];

    if (year) {
      usedCollections = [`accidents_${year}`];
    } else {
      usedCollections = accidentCollections;
    }

    for (const col of usedCollections) {
      total += await db.collection(col).countDocuments(query);
    }

    // res.json({ count: total });
    await sendWithMetadata(res, db, usedCollections, {
      count: total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/accidents/earliest:
 *   get:
 *     tags:
 *       - Accidents
 *     summary: Get the earliest accident from 2023 or 2024 that matches the given filters
 *     description: |
 *       Searches the accident collections from **accidents_2023** and **accidents_2024**.
 *       Returns the earliest accident based on month and hour that matches the filters.
 *
 *       Example:
 *       `/api/accidents/earliest?state=Sachsen`
 *
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: stateCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: districtCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: municipalityCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: hour
 *         schema:
 *           type: integer
 *       - in: query
 *         name: weekday
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *       - in: query
 *         name: typeGroup
 *         schema:
 *           type: integer
 *       - in: query
 *         name: light
 *         schema:
 *           type: integer
 *       - in: query
 *         name: roadCondition
 *         schema:
 *           type: integer
 *       - in: query
 *         name: bicycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: car
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pedestrian
 *         schema:
 *           type: integer
 *       - in: query
 *         name: motorcycle
 *         schema:
 *           type: integer
 *       - in: query
 *         name: truck
 *         schema:
 *           type: integer
 *       - in: query
 *         name: other
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: The earliest matching accident from 2023 or 2024
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Accident'
 *                 - type: object
 *                   properties:
 *                     earliestYear:
 *                       type: integer
 *                       nullable: true
 *                     accident:
 *                       type: object
 *                       nullable: true
 *                     message:
 *                       type: string
 *                       example: "No accidents found for this filter"
 *
 *       500:
 *         description: Server error
 */

//http://localhost:3000/api/accidents/earliest?state=Sachsen
app.get("/api/accidents/earliest", async (req, res) => {
  try {
    const query = buildQuery(req, stateNameToCode);

    const year = req.query.year ? Number(req.query.year) : null;


    let usedCollections = [];

    if (year) {
      usedCollections = [`accidents_${year}`];
    } else {
      usedCollections = accidentCollections; 
    }
    //const usedCollections = year ? [`accidents_${year}`] : accidentCollections;

    for (const col of usedCollections) {
      const accident = await db
        .collection(col)
        .find(query)
        .sort({
          "time.month": 1,
          "time.hour": 1,
        })
        .limit(1)
        .toArray();

      if (accident.length > 0) {
        // return res.json(accident[0]);
        return await sendWithMetadata(res, db, [col], accident[0]);
      }
    }

    // res.json({
    //   earliestYear: null,
    //   accident: null,
    //   message: "No accidents found for this filter",
    // });

    return await sendWithMetadata(res, db, ["accidents_2023", "accidents_2024"], {
      earliestYear: null,
      accident: null,
      message: "No accidents found for this filter",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/accidents/compare-states:
 *   get:
 *     tags:
 *       - Accidents
 *     summary: Compare accident statistics between multiple states (supports 2023 & 2024 datasets)
 *     description: |
 *       Compares accident statistics between one or more German states using accident datasets
 *       from **2023** and **2024**.
 *
 *       The API supports:
 *       - State names (e.g., `berlin`, `sachsen`)
 *       - State codes (e.g., `11`, `14`)
 *       - Year filtering (`year=2023`, `year=2024`, or both)
 *
 *       If no year is provided, the API uses **all available datasets** from:
 *       ```
 *       accidents_2023
 *       accidents_2024
 *       ```
 *
 *       ---
 *       ### Example Requests
 *
 *       Compare Berlin vs Sachsen in **2023**:
 *       ```
 *       /api/accidents/compare-states?state=berlin&state=sachsen&year=2023
 *       ```
 *
 *       Compare Berlin vs Sachsen in **2024**:
 *       ```
 *       /api/accidents/compare-states?state=berlin&state=sachsen&year=2024
 *       ```
 *
 *       Compare Berlin vs Sachsen using **both years**:
 *       ```
 *       /api/accidents/compare-states?state=berlin&state=sachsen
 *       ```
 *
 *     parameters:
 *       - in: query
 *         name: state
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: |
 *           State name(s).
 *           Examples:
 *           - `berlin`
 *           - `sachsen`
 *           - Multiple: `?state=berlin&state=sachsen`
 *
 *       - in: query
 *         name: stateCode
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: |
 *           State code(s).
 *           Examples:
 *           - `11` (Berlin)
 *           - `14` (Sachsen)
 *
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: ["2023", "2024"]
 *         description: |
 *           Filter by accident dataset year.
 *           Examples:
 *           - `year=2023`
 *           - `year=2024`
 *           - `year=2023&year=2024`
 *
 *     responses:
 *       200:
 *         description: Accident comparison results for each requested state
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stateCode:
 *                     type: integer
 *                     example: 11
 *                   stateName:
 *                     type: string
 *                     example: "Berlin"
 *                   totalAccidents:
 *                     type: integer
 *                     example: 45210
 *                   person_killed:
 *                     type: integer
 *                     example: 120
 *                   seriously_injured:
 *                     type: integer
 *                     example: 3100
 *                   slightly_injured:
 *                     type: integer
 *                     example: 42000
 *                   participants:
 *                     type: object
 *                     properties:
 *                       car:
 *                         type: integer
 *                         example: 30000
 *                       bicycle:
 *                         type: integer
 *                         example: 8000
 *                       pedestrian:
 *                         type: integer
 *                         example: 5000
 *                       motorcycle:
 *                         type: integer
 *                         example: 2000
 *                       truck:
 *                         type: integer
 *                         example: 900
 *                       other:
 *                         type: integer
 *                         example: 300
 *                   yearsIncluded:
 *                     type: array
 *                     example: ["accidents_2023", "accidents_2024"]
 *
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Provide at least one state or stateCode"
 *
 *       404:
 *         description: No matching accident data found
 *
 *       500:
 *         description: Server error
 */

//compare states using accident collections of 2023 and 2024
//localhost:3000/api/accidents_2024/compare-states?state=berlin&state=sachsen&year=2023
//localhost:3000/api/accidents_2024/compare-states?state=berlin&stateCode=14&year=2024
app.get("/api/accidents/compare-states", async (req, res) => {
  try {
    let { state, stateCode, year } = req.query;

    // Convert to arrays
    const stateNames = state ? (Array.isArray(state) ? state : [state]) : [];
    const stateCodes = stateCode
      ? Array.isArray(stateCode)
        ? stateCode.map(Number)
        : [Number(stateCode)]
      : [];

    // Convert state names → codes
    const nameCodes = stateNames
      .map((s) => s.toLowerCase().trim()) //Berlin to berlin
      .map((s) => stateNameToCode[s]) //berlin to 11
      .filter(Boolean); //brlin to []

    const codes = [...stateCodes, ...nameCodes]; //it stores every parameters in codes

    if (codes.length === 0) {
      return res.status(400).json({
        error: "Provide at least one state or stateCode",
      });
    }

    // YEAR FILTER
    let selectedCollections = [];

    if (year) {
      const years = Array.isArray(year) ? year : [year];

      selectedCollections = accidentCollections.filter((col) => {
        const colYear = col.match(/\d{4}$/)?.[0];
        return years.includes(colYear); //Keep only collections that match the requested years
      });

      if (selectedCollections.length === 0) {
        return res.status(400).json({
          error: "No accident dataset found for the requested year(s)",
        });
      }
    } else {
      // No year → use all datasets
      selectedCollections = [...accidentCollections];
    }

    // Load accidents from selected collections
    let allAccidents = [];

    for (const col of selectedCollections) {
      const accidents = await db
        .collection(col)
        .find({ "location.stateCode": { $in: codes } })
        .toArray();

      allAccidents.push(...accidents);
    }

    // Build comparison result
    const result = codes.map((code) => {
      const filtered = allAccidents.filter(
        (a) => a.location.stateCode === code,
      );
      return {
        stateCode: code,
        stateName: codeToStateName[code],

        totalAccidents: filtered.length,

        person_killed: filtered.filter((a) => a.classification.category === 1)
          .length,

        seriously_injured: filtered.filter(
          (a) => a.classification.category === 2,
        ).length,

        slightly_injured: filtered.filter(
          (a) => a.classification.category === 3,
        ).length,

        participants: {
          car: filtered.filter((a) => a.participants.car > 0).length,
          bicycle: filtered.filter((a) => a.participants.bicycle > 0).length,
          pedestrian: filtered.filter((a) => a.participants.pedestrian > 0)
            .length,
          motorcycle: filtered.filter((a) => a.participants.motorcycle > 0)
            .length,
          truck: filtered.filter((a) => a.participants.truck > 0).length,
          other: filtered.filter((a) => a.participants.other > 0).length,
        },

        yearsIncluded: selectedCollections, // helpful for debugging
      };
    });

    // res.json(result);
    await sendWithMetadata(res, db, selectedCollections, result);
  } catch (err) {
    console.error("Error comparing states:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /api/accidents_stats:
 *   get:
 *     tags:
 *       - Accident Statistics
 *     summary: Get aggregated accident statistics (2015–2024)
 *     description: |
 *       Returns aggregated accident statistics from the `accidents_stats` collection.
 *       You can filter by **year**, **category**, and **location**.
 *
 *       **Valid Years:** 2015–2024
 *
 *       **Valid Categories:**
 *       - `accidents_with_injuries`
 *       - `serious_property_damage`
 *       - `intoxication_related`
 *       - `other_property_damage`
 *       - `total`
 *
 *       **Valid Locations:**
 *       - `urban`
 *       - `rural`
 *       - `motorway`
 *       - `total`
 *
 *       Example:
 *       `/api/accidents_stats?category=serious_property_damage&year=2015&location=rural`
 *
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           enum: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
 *         description: Accident year (2015–2024)
 *
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum:
 *             - accidents_with_injuries
 *             - serious_property_damage
 *             - intoxication_related
 *             - other_property_damage
 *             - total
 *         description: Accident category
 *
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *           enum:
 *             - urban
 *             - rural
 *             - motorway
 *             - total
 *         description: Location type
 *
 *     responses:
 *       200:
 *         description: List of accident statistics matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: integer
 *                     example: 2015
 *                   category:
 *                     type: string
 *                     example: serious_property_damage
 *                   location:
 *                     type: string
 *                     example: rural
 *                   count:
 *                     type: integer
 *                     example: 1243
 *
 *       500:
 *         description: Server error
 */

//http://localhost:3000/api/accidents_stats?category=serious_property_damage&year=2015&location=rural
app.get("/api/accidents_stats", async (req, res) => {
  const { year, category, location } = req.query;

  const query = {};

  if (year) query.year = Number(year);
  if (category) query.category = category;
  if (location) query.location = location;

  const data = await accidents_stats.find(query).toArray();
  // res.json(data);
  await sendWithMetadata(res, db, ["accidents_stats"], data);
});

/**
 * @openapi
 * /api/accidents_stats/yoy:
 *   get:
 *     tags:
 *       - Accident Statistics
 *     summary: Year-over-year accident trend for a category and location
 *     description: |
 *       Computes **year-over-year (YoY)** changes for accident counts from 2015–2024
 *       based on the selected **category** and **location**.
 *
 *       The endpoint returns:
 *       - A YoY list showing the percentage change from the previous year
 *       - A summary block showing:
 *         - startValue (first year)
 *         - endValue (last year)
 *         - percentageChange (overall)
 *         - trend (increasing / decreasing / stable)
 *
 *       ---
 *       ### 🔵 Supported Categories
 *       These match the categories stored in the `accidents_stats` dataset:
 *
 *       - `accidents_with_injuries`
 *       - `serious_property_damage`
 *       - `intoxication_related`
 *       - `other_property_damage`
 *       - `total`
 *
 *       ---
 *       ### 🔵 Supported Locations
 *       - `urban`
 *       - `rural`
 *       - `motorway`
 *       - `total`
 *
 *       ---
 *       ### Example
 *       `/api/accidents_stats/yoy?category=serious_property_damage&location=rural`
 *
 *     parameters:
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - accidents_with_injuries
 *             - serious_property_damage
 *             - intoxication_related
 *             - other_property_damage
 *             - total
 *         description: Accident category to analyze.
 *
 *       - in: query
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - urban
 *             - rural
 *             - motorway
 *             - total
 *         description: Location type.
 *
 *     responses:
 *       200:
 *         description: YoY trend and summary for the selected category and location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category:
 *                   type: string
 *                   example: "serious_property_damage"
 *                 location:
 *                   type: string
 *                   example: "total"
 *                 startValue:
 *                   type: integer
 *                   example: 68776
 *                 endValue:
 *                   type: integer
 *                   example: 64080
 *                 percentageChange:
 *                   type: string
 *                   example: "-6.83%"
 *                 trend:
 *                   type: string
 *                   enum: [increasing, decreasing, stable]
 *                   example: "decreasing"
 *                 yoy:
 *                   type: array
 *                   description: Year-over-year changes
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                         example: 2016
 *                       count:
 *                         type: integer
 *                         example: 67000
 *                       change:
 *                         type: string
 *                         nullable: true
 *                         example: "-2.58%"
 *
 *       400:
 *         description: Missing category or location
 *
 *       404:
 *         description: No matching data found
 *
 *       500:
 *         description: Server error
 */

//year over year trend and overall trend
//http://localhost:3000/api/accidents_stats/yoy?category=serious_property_damage&location=rural
app.get("/api/accidents_stats/yoy", async (req, res) => {
  try {
    const { category, location } = req.query;

    if (!category || !location) {
      return res
        .status(400)
        .json({ error: "category and location are required" });
    }

    const result = await db
      .collection("accidents_stats")
      .find({ category, location })
      .sort({ year: 1 }) //ascending order in years 2015,2016
      .project({ _id: 0, year: 1, count: 1 }) //it returns the year and count but not useless id
      .toArray();

    if (result.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    // --------------------------
    // YEAR-OVER-YEAR CALCULATION
    // --------------------------
    const yoy = result.map((item, i) => {
      if (i === 0) return { ...item, change: null };

      const prev = result[i - 1].count;
      const curr = item.count;
      const pct = (((curr - prev) / prev) * 100).toFixed(2);

      return { ...item, change: `${pct}%` };
    });

    // --------------------------
    // SUMMARY CALCULATION
    // --------------------------
    const start = result[0];
    const end = result[result.length - 1];

    const pct = (((end.count - start.count) / start.count) * 100).toFixed(2);
    //.count means the it uses field count of accidents_stats datasets

    let trend = "stable";
    if (pct > 1) trend = "increasing";
    if (pct < -1) trend = "decreasing";

    // res.json({
    //   category,
    //   location,
    //   startValue: start.count,
    //   endValue: end.count,
    //   percentageChange: `${pct}%`,
    //   trend,
    //   yoy,
    // });
    await sendWithMetadata(res, db, ["accidents_stats"], {
      category,
      location,
      startValue: start.count,
      endValue: end.count,
      percentageChange: `${pct}%`,
      trend,
      yoy,
    });
  } catch (err) {
    console.error("Error computing YoY:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /api/accidents_per_district:
 *   get:
 *     tags:
 *       - Accidents per Districts
 *     summary: Get accident statistics for a district by key or district name
 *     description: |
 *       Returns accident statistics for a specific district using the `accidents_per_district` collection.
 *
 *       You can filter by:
 *       - **key** (district AGS prefix, e.g., `01001`)
 *       - **district** (district name, e.g., `Flensburg`)
 *
 *       Example:
 *       `/api/accidents_per_district?city=Flensburg&key=01001`
 *
 *     parameters:
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         description: |
 *           District key (AGS prefix).
 *           Example: `01001` for Flensburg district.
 *
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: |
 *           District name (case-insensitive).
 *           Example: `Flensburg`
 *
 *     responses:
 *       200:
 *         description: Accident statistics for the matching district(s)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   key:
 *                     type: string
 *                     example: "01001"
 *                   district:
 *                     type: string
 *                     example: "Flensburg"
 *                   accidents_per_10000:
 *                     type: number
 *                     example: 42.7
 *
 *       400:
 *         description: Invalid query parameters
 *
 *       500:
 *         description: Server error
 */

//Get accidents per district  by key and district
//http://localhost:3000/api/accidents_per_district?district=Flensburg&key=01001
app.get("/api/accidents_per_district", async (req, res) => {
  const { key, district } = req.query;
  const query = {};

  if (key) query.key = key;
  if (district) query.district = district;

  const data = await accidents_per_district.find(query).toArray();
  // res.json(data);
  await sendWithMetadata(res, db, ["accidents_per_district"], data);
});

/**
 * @openapi
 * /api/accidents_per_district/rates:
 *   get:
 *     tags:
 *       - Accidents per Districts
 *     summary: Get accident rates per district (per 100k inhabitants)
 *     description: |
 *       Returns accident rates for German districts using the `accidents_per_district` dataset.
 *
 *       The API supports:
 *       - Searching by **district name**
 *       - Searching by **state name**
 *       - Searching by **stateCode**
 *
 *       The accident rate is calculated as:
 *       ```
 *       rate_per_100k = accidents_per_10000 * 10
 *       ```
 *
 *       ---
 *       ### Example Requests
 *
 *       Search by district:
 *       ```
 *       /api/accidents_per_district/rates?district=Chemnitz
 *       ```
 *
 *       Search by state name:
 *       ```
 *       /api/accidents_per_district/rates?state=sachsen
 *       ```
 *
 *       Search by state code:
 *       ```
 *       /api/accidents_per_district/rates?stateCode=14
 *       ```
 *
 *     parameters:
 *       - in: query
 *         name: district
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           District name (case-insensitive).
 *           Example: `Chemnitz`
 *
 *       - in: query
 *         name: state
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           State name .
 *           Example: `sachsen`, `berlin`, `bayern`
 *
 *       - in: query
 *         name: stateCode
 *         required: false
 *         schema:
 *           type: integer
 *         description: |
 *           2‑digit German state code.
 *           Examples:
 *           - `11` → Berlin
 *           - `14` → Sachsen
 *
 *     responses:
 *       200:
 *         description: Accident rate results for matching districts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stateCode:
 *                     type: integer
 *                     example: 14
 *                   state:
 *                     type: string
 *                     example: "Sachsen"
 *                   districtCode:
 *                     type: string
 *                     description: 5‑digit AGS code
 *                     example: "14511"
 *                   district:
 *                     type: string
 *                     example: "Chemnitz"
 *                   rate_per_100k:
 *                     type: number
 *                     example: 457.3
 *
 *       400:
 *         description: Invalid state name or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid state name"
 *
 *       500:
 *         description: Server error while computing accident rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

//accident rate per 100,000 habitants using accidents_per_district
// http://localhost:3000/api/accidents_per_district/rates?district=Flensburg
// http://localhost:3000/api/accidents_per_district/rates?state=Sachsen
// http://localhost:3000/api/accidents_per_district/rates?stateCode=14
// /api/rates/cities?stateCode=14
//it returns the all districts accidents rate in given state

app.get("/api/accidents_per_district/rates", async (req, res) => {
  try {
    const { district, state, stateCode } = req.query;

    let filter = {};

    // 1. Search by city name
    if (district) {
      filter.district = { $regex: new RegExp(`^${district}$`, "i") };
    }

    // 2. Search by state name
    if (state) {
      const code = stateNameToCode[state.toLowerCase()];
      if (!code) {
        return res.status(400).json({ error: "Invalid state name" });
      }
      filter.key = { $regex: `^${code.toString().padStart(2, "0")}` };
    }

    // 3. Search by state code
    if (stateCode) {
      const code = stateCode.toString().padStart(2, "0"); //if 9 becomes "09"
      filter.key = { $regex: `^${code}` };
    }

    const data = await db
      .collection("accidents_per_district")
      .find(filter)
      .toArray();

    const result = data.map((item) => {
      const ags = item.key.toString();
      const stateCode = Number(ags.slice(0, 2));

      return {
        stateCode,
        state: codeToStateName[stateCode],
        districtCode: ags, //which is AGS
        district: item.district,
        rate_per_100k: item.accidents_per_10000 * 10,
      };
    });

    // res.json(result);
    await sendWithMetadata(res, db, ["accidents_per_district"], result);
  } catch (err) {
    console.error("Error computing accident rates:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /api/district/summary:
 *   get:
 *     tags:
 *       - District Statistics
 *     summary: Get accident participant totals for a district in a given year
 *     description: |
 *       Returns a detailed accident summary for a specific district in a given year.
 *
 *       This endpoint uses:
 *       - `accidents_per_district` (district metadata)
 *       - `accidents_2023` and `accidents_2024` (accident datasets)
 *
 *       You must provide **either**:
 *       - `district` (district name), or
 *       - `districtCode` (5‑digit district key)
 *
 *       If both are provided, they must refer to the same district.
 *
 *       ---
 *       ###  Special Case: Berlin (stateCode = 11) and Hamburg (stateCode = 2)
 *       Berlin and Hamburg are city‑states and do **not** have meaningful district codes in the accident dataset.
 *
 *       Therefore, when:
 *       - `district = berlin`, or
 *       - `districtCode` starts with `"11"`
 *       - `district = hamburg`, or
 *       - `districtCode` starts with `"2"`
 *
 *       The API automatically searches **only by stateCode = 11 and stateCode=2**, ignoring regionCode and districtCode.
 *
 *       Example:
 *       `/api/district/summary?district=berlin&year=2023`
 *
 *       ---
 *       ### Supported Years
 *       - 2023
 *       - 2024
 *
 *     parameters:
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [2023, 2024]
 *         description: Accident dataset year.
 *
 *       - in: query
 *         name: district
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           District name (case‑insensitive).
 *           Example: `Berlin`
 *
 *       - in: query
 *         name: districtCode
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           5‑digit district key (AGS prefix).
 *           Example: `11000` (Berlin)
 *
 *     responses:
 *       200:
 *         description: Accident summary for the district in the given year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   example: "11000"
 *                 district:
 *                   type: string
 *                   example: "Berlin"
 *                 state:
 *                   type: string
 *                   example: "Berlin"
 *                 stateCode:
 *                   type: integer
 *                   example: 11
 *                 accidents_per_10000_in_district:
 *                   type: number
 *                   example: 49.4
 *                 totals:
 *                   type: object
 *                   properties:
 *                     bicycle:
 *                       type: integer
 *                       example: 312
 *                     car:
 *                       type: integer
 *                       example: 1280
 *                     pedestrian:
 *                       type: integer
 *                       example: 145
 *                     motorcycle:
 *                       type: integer
 *                       example: 87
 *                     truck:
 *                       type: integer
 *                       example: 42
 *                     other:
 *                       type: integer
 *                       example: 19
 *
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "district and districtCode do not match"
 *
 *       404:
 *         description: District not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "District not found"
 *
 *       500:
 *         description: Server error
 */

//localhost:3000/api/district/summary?district=Dresden&year=2023
//This gives the exact number of accidents of by participants
// using district name in the particular year by accidents_per_district and
//accidents_2023 and accidents_2024
//How many bicycle accidents occurred in Dresden in 2024?
app.get("/api/district/summary", async (req, res) => {
  try {
    const { year, district, districtCode } = req.query;

    // 1. Validate required fields
    if (!year) {
      return res.status(400).json({ error: "year is required" });
    }

    if (!district && !districtCode) {
      return res
        .status(400)
        .json({ error: "district or districtCode is required" });
    }

    // 2. Validate year → must exist in accidentCollections
    const collectionName = `accidents_${year}`;

    if (!accidentCollections.includes(collectionName)) {
      return res.status(400).json({ error: "Invalid or unsupported year" });
    }

    // 3. Find district info from accidents_per_districts
    let districtInfo = null; //it stores the particular district document/field from accidents_per_district

    if (districtCode) {
      districtInfo = await db
        .collection("accidents_per_district")
        .findOne({ key: districtCode });
    }

    if (!districtInfo && district) {
      districtInfo = await db
        .collection("accidents_per_district")
        .findOne({ district });
    }

    if (!districtInfo) {
      return res.status(404).json({ error: "District not found" });
    }

    // 4. If both district and districtCode provided → verify match
    if (district && districtCode) {
      if (
        districtInfo.key !== districtCode ||
        districtInfo.district !== district
      ) {
        return res
          .status(400)
          .json({ error: "district and districtCode do not match" });
      }
    }

    // 5. Convert district key → stateCode, regionCode, districtCode
    const key = districtInfo.key;
    const stateCode = parseInt(key.slice(0, 2));
    const regionCode = parseInt(key.slice(2, 3));
    const distCode = parseInt(key.slice(3, 5));
    const state = codeToStateName[stateCode];

    // SPECIAL CASE: Berlin (stateCode = 11)
    let matchQuery;

    if (stateCode === 11 || stateCode === 2) {
      // Berlin (11) and Hamburg (02) → state-only match
      matchQuery = {
        "location.stateCode": 11,
      };
    } else {
      // Normal districts
      matchQuery = {
        "location.stateCode": stateCode,
        "location.regionCode": regionCode,
        "location.districtCode": distCode,
      };
    }

    // 6. Count participants
    const totals = {
      bicycle: 0,
      car: 0,
      pedestrian: 0,
      motorcycle: 0,
      truck: 0,
      other: 0,
    };

    const cursor = db.collection(collectionName).find(matchQuery);

    while (await cursor.hasNext()) {
      const acc = await cursor.next();
      totals.bicycle += acc.participants.bicycle;
      totals.car += acc.participants.car;
      totals.pedestrian += acc.participants.pedestrian;
      totals.motorcycle += acc.participants.motorcycle;
      totals.truck += acc.participants.truck;
      totals.other += acc.participants.other;
    }

    // res.json({
    //   key: districtInfo.key,
    //   district: districtInfo.district,
    //   state,
    //   stateCode,
    //   accidents_per_10000_in_district: districtInfo.accidents_per_10000,
    //   totals,
    // });
    await sendWithMetadata(
      res,
      db,
      [collectionName, "accidents_per_district"],
      {
        key: districtInfo.key,
        district: districtInfo.district,
        state,
        stateCode,
        accidents_per_10000_in_district: districtInfo.accidents_per_10000,
        totals,
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/district/earliest:
 *   get:
 *     tags:
 *       - District Statistics
 *     summary: Get the earliest accident record for a district
 *     description: |
 *       Returns the earliest accident record for a given district by:
 *       - Searching the `accidents_per_district` collection to retrieve the district's AGS key
 *       - Extracting stateCode, regionCode, and districtCode from the AGS key
 *       - Searching accident datasets (e.g., `accidents_2023`, `accidents_2024`)
 *       - Sorting by **year → month → hour** to find the earliest accident
 *
 *       ---
 *       ### 🔵 Special Case: Berlin (stateCode = 11) & Hamburg (stateCode = 02)
 *       These city-states do not use meaningful regionCode/districtCode in accident datasets.
 *       Therefore, the API matches **only by stateCode**.
 *
 *       Example:
 *       `/api/district/earliest?district=Chemnitz`
 *
 *     parameters:
 *       - in: query
 *         name: district
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           District name (case-insensitive).
 *           Examples: `Chemnitz`, `Flensburg`, `Leipzig`, `Dresden`, `Berlin`, `Hamburg`
 *
 *     responses:
 *       200:
 *         description: Earliest accident record for the district
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   example: "14511"
 *                 district:
 *                   type: string
 *                   example: "Chemnitz"
 *                 accidents_per_10000:
 *                   type: number
 *                   example: 45.7
 *                 earliestAccident:
 *                   type: object
 *                   nullable: true
 *                   description: Earliest accident record found for this district
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6a2518a39661d306ae29cfbc"
 *                     accidentId:
 *                       type: integer
 *                       example: 136209
 *                     location:
 *                       type: object
 *                       properties:
 *                         stateCode:
 *                           type: integer
 *                           example: 14
 *                         regionCode:
 *                           type: integer
 *                           example: 5
 *                         districtCode:
 *                           type: integer
 *                           example: 11
 *                         municipalityCode:
 *                           type: integer
 *                           example: 0
 *                     time:
 *                       type: object
 *                       properties:
 *                         year:
 *                           type: integer
 *                           example: 2023
 *                         month:
 *                           type: integer
 *                           example: 1
 *                         hour:
 *                           type: integer
 *                           example: 0
 *                         weekday:
 *                           type: integer
 *                           example: 3
 *                     classification:
 *                       type: object
 *                       properties:
 *                         category:
 *                           type: integer
 *                           example: 3
 *                         type:
 *                           type: integer
 *                           example: 8
 *                         typeGroup:
 *                           type: integer
 *                           example: 1
 *                     conditions:
 *                       type: object
 *                       properties:
 *                         light:
 *                           type: integer
 *                           example: 2
 *                         roadCondition:
 *                           type: integer
 *                           example: 2
 *                     participants:
 *                       type: object
 *                       properties:
 *                         bicycle:
 *                           type: integer
 *                           example: 0
 *                         car:
 *                           type: integer
 *                           example: 1
 *                         pedestrian:
 *                           type: integer
 *                           example: 0
 *                         motorcycle:
 *                           type: integer
 *                           example: 0
 *                         truck:
 *                           type: integer
 *                           example: 0
 *                         other:
 *                           type: integer
 *                           example: 0
 *
 *       400:
 *         description: Missing or invalid district parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "district is required"
 *
 *       404:
 *         description: District not found in accidents_per_district
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "District not found"
 *
 *       500:
 *         description: Server error
 */

//localhost:3000/api/district/earliest?district=Flensburg
//This gives the earliest accident by searching using district name
app.get("/api/district/earliest", async (req, res) => {
  try {
    const { district } = req.query;

    if (!district) {
      return res.status(400).json({ error: "district is required" });
    }

    // 1. Find district in accidents_per_district
    const districtInfo = await db
      .collection("accidents_per_district")
      .findOne({ district: new RegExp(`^${district}$`, "i") });

    if (!districtInfo) {
      return res.status(404).json({ error: "District not found" });
    }

    const key = districtInfo.key;

    // Extract AGS components
    const stateCode = Number(key.slice(0, 2));
    const regionCode = Number(key.slice(2, 3));
    const districtCode = Number(key.slice(3, 5));

    // Accident collections (dynamic)
    const collections = accidentCollections
      .map((name) => {
        const match = name.match(/(\d{4})$/);
        return match ? { name, year: Number(match[1]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.year - b.year);

    let earliestAccident = null;
    let earliestCollection = null;

    // Special-case: Berlin (11) and Hamburg (02)
    const isCityState = stateCode === 11 || stateCode === 2;

    // 2. Search earliest accident across collections
    for (const col of collections) {
      const coll = db.collection(col.name);

      const query = isCityState
        ? { "location.stateCode": stateCode }
        : {
          "location.stateCode": stateCode,
          "location.regionCode": regionCode,
          "location.districtCode": districtCode,
        };

      // Sort by year, month, hour → earliest first
      const accident = await coll
        .find(query)
        .sort({
          "time.year": 1,
          "time.month": 1,
          "time.hour": 1,
        })
        .limit(1)
        .next();

      if (accident) {
        earliestAccident = accident;
        earliestCollection = col.name;
        break;
      }
    }

    // res.json({
    //   key,
    //   district: districtInfo.district,
    //   accidents_per_10000: districtInfo.accidents_per_10000,
    //   earliestAccident,
    // });
    await sendWithMetadata(
      res,
      db,
      [earliestCollection, "accidents_per_district"],
      {
        key,
        district: districtInfo.district,
        accidents_per_10000: districtInfo.accidents_per_10000,
        earliestAccident,
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/municipality:
 *   get:
 *     tags:
 *       - Municipality
 *     summary: Get all municipalities (raw data)
 *     description: Returns all municipality documents exactly as stored in MongoDB.
 *     responses:
 *       200:
 *         description: Raw municipality data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Municipality'
 *       500:
 *         description: Server error
 */
app.get("/api/municipality", async (req, res) => {
  try {
    const municipalities = await db
      .collection("municipality")
      .find({})
      .toArray(); // raw data, no sorting, no count

    // res.json(municipalities); // return raw array
    await sendWithMetadata(res, db, ["municipality"], municipalities);
  } catch (err) {
    console.error("Error fetching municipalities:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/municipality/zero-accidents:
 *   get:
 *     tags:
 *       - Municipality
 *     summary: Get municipalities with zero accidents for a given state and year
 *     description: |
 *       Returns all municipalities within a given German federal state that recorded **zero accidents**
 *       in the specified year.
 *
 *       This endpoint uses:
 *       - `municipality` collection
 *       - `accidents_2023`
 *       - `accidents_2024`
 *
 *       **Supported Years:** 2023, 2024
 *
 *       **Supported States (examples):**
 *       - `sachsen`
 *       - `berlin`
 *       - `bayern`
 *       - `niedersachsen`
 *       - `hessen`
 *       - `sachsen-anhalt`
 *       - `schleswig-holstein`
 *       - `baden-württemberg`
 *
 *       Example:
 *       `/api/municipality/zero-accidents?state=sachsen&year=2023`
 *
 *     parameters:
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           German federal state name (case-insensitive).
 *           Must match the internal `stateNameToCode` mapping.
 *
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [2023, 2024]
 *         description: Accident dataset year.
 *
 *     responses:
 *       200:
 *         description: List of municipalities with zero accidents in the given state and year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   example: sachsen
 *                 year:
 *                   type: integer
 *                   example: 2023
 *                 totalMunicipalities:
 *                   type: integer
 *                   example: 412
 *                 toalMunicipalitiesWithZeroAccidentCount:
 *                   type: integer
 *                   example: 128
 *                 zeroAccidentMunicipalities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       AGS:
 *                         type: string
 *                         example: "14625010"
 *                       municipality:
 *                         type: string
 *                         example: "Dresden"
 *
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "state and year are required"
 *
 *       500:
 *         description: Server error
 */

//localhost:3000/api/municipality/zero-accidents?state=sachsen&year=2023
//use databases of accidents 2023, accidents 2024 and municipality
app.get("/api/municipality/zero-accidents", async (req, res) => {
  try {
    const { state, year } = req.query;

    // 1. Validate inputs
    if (!state || !year) {
      return res.status(400).json({
        error: "state and year are required",
      });
    }

    // 2. Validate year
    const collectionName = `accidents_${year}`;
    if (!accidentCollections.includes(collectionName)) {
      return res.status(400).json({ error: "Invalid or unsupported year" });
    }

    // 3. Convert state name → stateCode
    const normalized = state.toLowerCase().trim();
    const stateCode = stateNameToCode[normalized];

    if (!stateCode) {
      return res.status(400).json({ error: "Invalid state name" });
    }

    // 4. Load all municipalities in this state
    const allMunicipalities = await db
      .collection("municipality")
      .find({ AGS: new RegExp(`^${String(stateCode).padStart(2, "0")}`) })
      .toArray();

    // Create a Set of all AGS codes in this state
    const allAGS = new Set(allMunicipalities.map((m) => m.AGS));

    // 5. Query accidents for this state
    const accidentsCursor = db.collection(collectionName).find({
      "location.stateCode": stateCode,
    }); //it stores the all fields related to particular state

    // Track AGS codes that had accidents
    const accidentAGS = new Set();

    // Helper to build AGS
    const buildAGS = (loc) => {
      const s = String(loc.stateCode).padStart(2, "0");
      const r = String(loc.regionCode);
      const d = String(loc.districtCode).padStart(2, "0");
      const m = String(loc.municipalityCode).padStart(3, "0");
      return s + r + d + m;
    };

    // 6. Loop through accidents and record AGS
    while (await accidentsCursor.hasNext()) {
      const acc = await accidentsCursor.next();
      const AGS = buildAGS(acc.location);
      accidentAGS.add(AGS); //it will add the municipality AGS code from accidents_2023 and accidents_2024 datasets
    }

    // 7. Municipalities with zero accidents
    const zeroAccidentMunicipalities = allMunicipalities.filter((m) => {
      return !accidentAGS.has(m.AGS);
    });

    // 8. Final response
    // res.json({
    //   state,
    //   year,
    //   totalMunicipalities: allMunicipalities.length,
    //   toalMunicipalitiesWithZeroAccidentCount:
    //     zeroAccidentMunicipalities.length,
    //   zeroAccidentMunicipalities,
    // });
    await sendWithMetadata(
      res,
      db,
      [collectionName, "municipality"],
      {
        state,
        year,
        totalMunicipalities: allMunicipalities.length,
        toalMunicipalitiesWithZeroAccidentCount:
          zeroAccidentMunicipalities.length,
        zeroAccidentMunicipalities,
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @openapi
 * /api/licenses:
 *   get:
 *     tags:
 *       - Metadata
 *     summary: Get dataset license and provenance metadata
 *     description: Returns license and provenance information for all datasets used in this API.
 *     responses:
 *       200:
 *         description: List of dataset metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DatasetMetadata'
 */

app.get("/api/licenses", async (req, res) => {
  const metadata = await db.collection("dataset_metadata").find().toArray();
  res.json(metadata);
});

// -------------------------
// Start Server
// -------------------------
app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});
