import { count } from "node:console";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// http://localhost:3000/api-docs/#/

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "German Accident API",
      version: "1.0.0",
      description: `
This API provides access to German accident datasets of 2023 and 2024, municipalities, districts, and statistical analytics.

### **Data Sources**
- Unfallatlas (OpenGeoData NRW): Raw accident points (2023–2024)  
  https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/

- Gemeindeverzeichnis (Destatis): Municipality AGS codes  
  https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis

- Accident statistics from 2015-2024 (accidents_stats)  
  OPAL from the professorship of data management

- District accident rates per 10000 (accidents_per_district)  
  OPAL from the professorship of data management

### Data Sources & Licenses
- Unfallatlas (accidents_2023, accidents_2024) — DL-DE-BY-2.0
- Gemeindeverzeichnis (municipality) 
- OPAL datasets (accidents_per_district, accidents_stats) — Academic use only


### **Database Collections**
- accidents_2023 and accidents_2024
- municipality
- accidents_stats
- accidents_per_district
- dataset_metadata
`,
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
    ],
    tags: [
      { name: "Accidents", 
        description: "Accident datasets of 2023 and 2024" },
      {
        name: "Municipality",
        description: "Municipality-level data and analytics",
      },
      {
        name: "Accidents per Districts",
        description: "District-level accident statistics",
      },
      {
        name: "Accident Statistics",
        description: "Aggregated accident statistics",
      },
      {
        name: "District Statistics",
        description: "Analysising the district and accidents datasets",
      },
      {
        name: "Metadata",
        description: "Dataset license and provenance metadata",
      },
    ],
    components: {
      schemas: {
        Accident: {
          type: "object",
          properties: {
            accidentId: {
              type: "integer",
              description: "Serial accident ID from Unfallatlas",
              example: 123456,
            },

            location: {
              type: "object",
              properties: {
                stateCode: {
                  type: "integer",
                  description: `
ULAND – Federal State:
01 = Schleswig-Holstein  
02 = Hamburg  
03 = Niedersachsen  
04 = Bremen  
05 = Nordrhein-Westfalen  
06 = Hessen  
07 = Rheinland-Pfalz  
08 = Baden-Württemberg  
09 = Bayern  
10 = Saarland  
11 = Berlin  
12 = Brandenburg  
13 = Mecklenburg-Vorpommern  
14 = Sachsen  
15 = Sachsen-Anhalt  
16 = Thüringen`,
                  example: 14,
                },
                regionCode: {
                  type: "integer",
                  description:
                    "UREGBEZ – Administrative region (Regierungsbezirk)",
                  example: 0,
                },
                districtCode: {
                  type: "integer",
                  description: "UKREIS – Administrative district",
                  example: 125,
                },
                municipalityCode: {
                  type: "integer",
                  description: "UGEMEINDE – Municipality code",
                  example: 12,
                },
              },
            },

            time: {
              type: "object",
              properties: {
                year: {
                  type: "integer",
                  description: "UJAHR – Year of accident",
                  example: 2024,
                },
                month: {
                  type: "integer",
                  description: "UMONAT – Month of accident (1–12)",
                  example: 5,
                },
                hour: {
                  type: "integer",
                  description: "USTUNDE – Hour of accident (0–23)",
                  example: 14,
                },
                weekday: {
                  type: "integer",
                  description: `
UWOCHENTAG – Day of week:
1 = Sunday  
2 = Monday  
3 = Tuesday  
4 = Wednesday  
5 = Thursday  
6 = Friday  
7 = Saturday`,
                  example: 4,
                },
              },
            },

            classification: {
              type: "object",
              properties: {
                category: {
                  type: "integer",
                  description: `
UKATEGORIE – Accident severity:
1 = Accident with persons killed  
2 = Accident with seriously injured  
3 = Accident with slightly injured`,
                  example: 3,
                },
                type: {
                  type: "integer",
                  description: `
UART – Kind of accident:
1 = Collision with starting/stopping/stationary vehicle  
2 = Collision with vehicle moving ahead/waiting  
3 = Collision with vehicle moving laterally  
4 = Collision with oncoming vehicle  
5 = Collision with turning/crossing vehicle  
6 = Collision with pedestrian  
7 = Collision with obstacle  
8 = Leaving carriageway to the right  
9 = Leaving carriageway to the left  
0 = Other accident`,
                  example: 5,
                },
                typeGroup: {
                  type: "integer",
                  description: `
UTYP1 – Type of accident:
1 = Driving accident  
2 = Turning-off accident  
3 = Turning/crossing accident  
4 = Crossing accident  
5 = Accident involving stationary  
6 = Accident between vehicles moving along  
7 = Other accident`,
                  example: 3,
                },
              },
            },

            conditions: {
              type: "object",
              properties: {
                light: {
                  type: "integer",
                  description: `
ULICHTVERH – Light conditions:
0 = Daylight  
1 = Twilight  
2 = Darkness`,
                  example: 0,
                },
                roadCondition: {
                  type: "integer",
                  description: `
USTRZUSTAND – Road surface:
0 = Dry  
1 = Wet/damp/slippery  
2 = Slippery (winter)`,
                  example: 1,
                },
              },
            },

            participants: {
              type: "object",
              properties: {
                bicycle: {
                  type: "integer",
                  description:
                    "IstRad – 1 = bicycle involved, 0 = not involved",
                  example: 1,
                },
                car: {
                  type: "integer",
                  description:
                    "IstPKW – 1 = passenger car involved, 0 = not involved",
                  example: 1,
                },
                pedestrian: {
                  type: "integer",
                  description:
                    "IstFuss – 1 = pedestrian involved, 0 = not involved",
                  example: 0,
                },
                motorcycle: {
                  type: "integer",
                  description:
                    "IstKrad – 1 = motorcycle involved, 0 = not involved",
                  example: 0,
                },
                truck: {
                  type: "integer",
                  description:
                    "IstGkfz – 1 = goods vehicle involved, 0 = not involved",
                  example: 0,
                },
                other: {
                  type: "integer",
                  description:
                    "IstSonstige – 1 = other transport involved, 0 = not involved",
                  example: 0,
                },
              },
            },
          },
        },

        Municipality: {
          type: "object",
          properties: {
            AGS: { type: "string", example: "01001000" },
            municipality: { type: "string", example: "Flensburg, Stadt" },
          },
        },

        Accidents_per_District: {
          type: "object",
          properties: {
            key: { type: "string", example: "01001" },
            district: { type: "string", example: "Flensburg" },
            accidents_per_10000: { type: "number", example: 45.7 },
          },
        },

        Accidents_per_Stats: {
          type: "object",
          properties: {
            category: { type: "string", example: "accidents_with_injuries" },
            location: { type: "string", example: "Flensburg" },
            year: { type: "number", example: 2023 },
            count: { type: "number", example: 209821 },
          },
        },

        DatasetMetadata: {
          type: "object",
          properties: {
            dataset: { type: "string", example: "accidents_2023" },
            source: {
              type: "string",
              example:
                "Unfallatlas – Statistical Offices of the Federation and the Länder",
            },
            source_url: {
              type: "string",
              example:
                "https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/",
            },
            license: { type: "string", example: "DL-DE-BY-2.0" },
            license_url: {
              type: "string",
              example: "https://www.govdata.de/dl-de/by-2-0",
            },
            attribution: {
              type: "string",
              example:
                "Source: Statistical Offices of the Federation and the Länder, Unfallatlas",
            },
          },
        }
      },
    },
  },

  apis: ["./server.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiMiddleware = swaggerUi;
