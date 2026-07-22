// utils/buildQuery.js

export function buildQuery(req, stateNameToCode) {
  const {
    accidentId,
    state,
    stateCode,
    regionCode,
    districtCode,
    municipalityCode,
    year,
    month,
    hour,
    weekday,
    category,
    type,
    typeGroup,
    light,
    roadCondition,
    bicycle,
    car,
    pedestrian,
    motorcycle,
    truck,
    other,
  } = req.query;

  const query = {};

  if (accidentId) query.accidentId = Number(accidentId);

  if (stateCode) query["location.stateCode"] = Number(stateCode);
  if (regionCode) query["location.regionCode"] = Number(regionCode);
  if (districtCode) query["location.districtCode"] = Number(districtCode);
  if (municipalityCode) query["location.municipalityCode"] = Number(municipalityCode);

  if (state) {
    const normalized = state.toLowerCase().trim();
    const code = stateNameToCode[normalized];
    query["location.stateCode"] = Number(code);
  }

  if (year) query["time.year"] = Number(year);
  if (month) query["time.month"] = Number(month);
  if (hour) query["time.hour"] = Number(hour);
  if (weekday) query["time.weekday"] = Number(weekday);

  if (category) query["classification.category"] = Number(category);
  if (type) query["classification.type"] = Number(type);
  if (typeGroup) query["classification.typeGroup"] = Number(typeGroup);

  if (light) query["conditions.light"] = Number(light);
  if (roadCondition) query["conditions.roadCondition"] = Number(roadCondition);

  if (bicycle) query["participants.bicycle"] = Number(bicycle);
  if (car) query["participants.car"] = Number(car);
  if (pedestrian) query["participants.pedestrian"] = Number(pedestrian);
  if (motorcycle) query["participants.motorcycle"] = Number(motorcycle);
  if (truck) query["participants.truck"] = Number(truck);
  if (other) query["participants.other"] = Number(other);


  return query;
}
