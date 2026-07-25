Project Title: German Accident Data API

A backend API built with Node.js, Express, and MongoDB for analyzing German traffic accident datasets across multiple years. Includes district-level search, accident summaries, participant statistics, rate calculations, and metadata handling.

1. Introduction
The German Accident Data API provides programmatic access to multiple datasets:
•	Accident datasets (2023 & 2024)
•	Municipality dataset
•	Accident statistics (2015–2024)
•	District accident rates
•	Dataset metadata (licenses + provenance)
The API is built using Node.js, Express, and MongoDB, and documented using Swagger (OpenAPI 3.0).

2. Requirements
Software
•	Node.js (v18 or higher)
•	MongoDB Community Server
•	IDE (such as: VS Code)

3. Installation
Step 1 — Install dependencies
Code
npm install express cors mongodb swagger-ui-express swagger-jsdoc dotenv 
(Note: may not necessary, I already provided it. If it didn’t working properly, then you can also install dependencies freshly again.)
Step 2 — Start MongoDB
Create separate db2 folder in c:\data\db2
Then run below command  
mongod --port 27018 --dbpath "C:\data\db2" (Note: don’t close the cmd window after running this command because this may not the default port in your computer.)
After this command minimize that window and in other cmd window run below code
mongosh --port 27018
Step 3 — Insert data (run once)
Code
node import_2023_directly.js (Note: make sure all source datasets should be in same folder such as municipality.xlsx, Unfallorte2023_LinRef.csv etc. )
node import_2024_directly.js 
node import_2023_directly.js
node import_municipality.js
node import_stats_directly.js
node import_per_districts.js (Note: just rename accidents_per_city in opal into accidents_per_district. It’s a same file. I renamed it.)
node insertMetadata.js (Note: just run this, it don’t need external datasets. It just insert fields)  
Note: All files name should be match with the metioned in the script code

Step 4 — Start the API
Run below Code
node server.js 
Server runs at:
Code
http://localhost:3000

4. API Documentation (Swagger UI)
Open in browser:
Code
http://localhost:3000/api-docs
Swagger UI provides:
•	Endpoint descriptions
•	Query parameters
•	Response schemas
•	Live testing interface
•	DatasetMetadata schema
•	/api/licenses endpoint

5. Available Endpoints
5.1 Accident Search
Code
GET /api/accidents
For example: locahost:3000/api/accidents?state=berlin&car=1&bicycle=1&year=2023
Filters:
•	state, stateCode
•	districtCode, municipalityCode
•	year, month, hour, weekday
•	accident type, severity
•	participants (car, bicycle, pedestrian…)
It returns the fields of the accidents_2023 and accidents_2024 collections that matches with the search filters.
5.2 Accident Count
Code
GET /api/accidents/count
For example: locahost:3000/api/accidents/count?state=berlin&car=1&bicycle=1&year=2023
Same filters as accidents api
Returns:
Code
{ "count": 12345 }

5.3 Earliest Accident
Code
GET /api/accidents/earliest
Also same filters as accidents api
For example: locahost:3000/api/accidents/earliest?state=berlin&car=1&bicycle=1&year=2023
It return the earliest accident fields from accidents_2023 and accidents_2024 that matches the filters.

5.4 Compare States
Code
GET /api/accidents/compare-states?state=berlin&state=Sachsen
For example: localhost:3000/api/accidents/compare-states?state=berlin&state=sachsen&year=2024
It compares the two states by returning the total number of participants and category of two states.

5.5 Accident Statistics (2015–2024)
Code
GET /api/accidents_stats
Filters
Category, location and year
For example: localhost:3000/api/accidents_stats?category=other_property_damage&year=2023&location=rural

5.6 Year over Year Trend
Code
GET /api/accidents_stats/yoy
For example: localhost:3000/api/accidents_stats/yoy?category=serious_property_damage&location=urban
It uses the filters of category and location. It just compares and summarise the year and year trends throughout the years based on the category and location. It gives percentage information and increasing or decreasing information.
5.7 District Accident Rates
Code
GET /api/accidents_per_district
For example: localhost:3000/api/accidents_per_district?district=Flensburg
And also: localhost:3000/api/accidents_per_district?key=”01001”

5.8 Summary of District Accident 
Code
GET /api/district/summary
For example: localhost:3000/api/district/summary?district=Chemnitz&year=2023
It gives the district level data using three datasets accidents_2023, accidents_2024 and accident_per_district. It uses the AGS code from accidents_per_district to find out the particular accident from accidents datasets. 

And also: 

5.9 Earliest District Accident 
Code
GET /api/district/earliest
For example: localhost:3000/api/district/earliest?year=2023&district=Chemnitz
It gives the earliest accident field from accidents_2023 and accidents_2024 datasets from particular district and year.

6.0 Dataset Metadata (Licenses + Provenance)
Code
GET /api/licenses
For example: localhost:3000/api/licenses
Returns:
Code
[
  {
    "dataset": "accidents_2023",
    "license": "DL-DE-BY-2.0",
    "source": "...",
    "attribution": "..."
  }
]

6. Metadata Injection (Important for Grading)
Every API response includes:
Code
{
  "data": [...],
  "metadata": [...]
} Note
This fulfills the project requirement:
•	Identify dataset licenses  
•	Include provenance 
•	Return metadata with responses


7. How to Reproduce the Database
The raw datasets are not included in the submission (as required). They can be reproduced using:
•	ETL/import scripts in /scripts
•	Public sources listed in swagger api.
•	Metadata stored in dataset_metadata

8. Troubleshooting
Port already in use
Change port in server.js:
Code
app.listen(3000)
MongoDB connection error
Ensure:
Code
mongod --port 27018
matches:
Code
mongodb://localhost:27018
Swagger not loading
Check:
Code
/api-docs  Swagger UI
and ensure swagger.js is imported correctly.

