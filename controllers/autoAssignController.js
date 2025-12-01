// controllers/autoAssignController.js
const mongoose = require("mongoose");
const Report = require("../models/Report");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");

/**
 * Helper: run $geoNear on a raw collection and return array
 * collectionName: string (e.g. "ambulances", "hospitals")
 * coords: [lng, lat]
 */
async function geoNearCollection(collectionName, coords, maxDistance = 20000) {
  return await mongoose.connection
    .collection(collectionName)
    .aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: coords },
          distanceField: "distance",
          spherical: true,
          maxDistance,
        },
      },
    ])
    .toArray();
}

function isAmbulanceAvailable(aDoc) {
  // Accept several possible shapes/casings
  const status = (aDoc.status || "").toString().toLowerCase();
  const online = aDoc.onlineStatus;
  // Accept if status includes "avail" (Available / available) AND (onlineStatus !== false)
  return status.includes("avail") && (online === undefined || online === true);
}

function hospitalHasCapacity(hDoc) {
  const status = (hDoc.status || "").toString().toLowerCase();
  // bed count may be bedAvailability or availableBeds
  const beds = (hDoc.bedAvailability ?? hDoc.availableBeds ?? 0);
  // If capacity fields like maxAmbulanceCapacity/currentlyAssignedAmbulances exist, try to respect them
  const maxAmb = hDoc.maxAmbulanceCapacity ?? null;
  const currAssigned = hDoc.currentlyAssignedAmbulances ?? null;

  const statusOk = status === "active" || status === "online" || status === "available";
  const bedsOk = Number(beds) > 0;

  const capacityOk =
    maxAmb === null || currAssigned === null ? true : (currAssigned < maxAmb);

  return statusOk && bedsOk && capacityOk;
}

exports.autoAssign = async (req, res) => {
  try {
    const reportId = req.params.id;
    if (!reportId) return res.status(400).json({ msg: "Missing report id" });

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ msg: "Report not found" });

    const coords = report.location && report.location.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return res.status(400).json({ msg: "Report missing valid coordinates" });
    }

    // Ensure coords are [lng, lat]
    const userCoords = [parseFloat(coords[0]), parseFloat(coords[1])];

    // --- 1) Find nearest ambulances (raw collection)
    let ambulances = [];
    try {
      ambulances = await geoNearCollection("ambulances", userCoords, 30000); // 30km
    } catch (e) {
      console.error("GeoNear ambulances error:", e);
      return res.status(500).json({ msg: "Geo query error (ambulances)" });
    }

    // Filter available ambulances using tolerant check
    ambulances = ambulances.filter(isAmbulanceAvailable);

    if (!ambulances || ambulances.length === 0) {
      console.warn("AutoAssign -> no ambulances matched availability filter.");
      return res.status(400).json({ msg: "No ambulances available" });
    }

    const nearestAmbulance = ambulances[0];

    // --- 2) Find nearest hospitals
    let hospitals = [];
    try {
      hospitals = await geoNearCollection("hospitals", userCoords, 50000); // 50km
    } catch (e) {
      console.error("GeoNear hospitals error:", e);
      return res.status(500).json({ msg: "Geo query error (hospitals)" });
    }

    // Filter hospitals using tolerant checks for your schema
    hospitals = hospitals.filter(hospitalHasCapacity);

    if (!hospitals || hospitals.length === 0) {
      console.warn("AutoAssign -> no hospitals matched capacity filter.");
      return res.status(400).json({ msg: "No hospitals available" });
    }

    const nearestHospital = hospitals[0];

    // --- 3) Persist assignment to Report
    // Use Report model (Mongoose) to update assigned fields
    report.assignedAmbulance = nearestAmbulance._id;
    report.assignedHospital = nearestHospital._id;
    report.status = "assigned";
    // Optional: store nearest distances for logs
    report.nearestAmbulanceDistances = ambulances.map(a => ({
      ambulanceId: a._id,
      distance: (a.distance ?? 0) / 1000,
    }));
    report.nearestHospitalDistances = hospitals.map(h => ({
      hospitalId: h._id,
      distance: (h.distance ?? 0) / 1000,
    }));

    await report.save();

    // --- 4) Update ambulance record: mark as busy and attach assignedReport
    // Keep casing consistent with Ambulance schema ('available' | 'busy' | 'offline')
    try {
      await Ambulance.findByIdAndUpdate(nearestAmbulance._id, {
        $set: {
          status: "busy",
          // "assignedReport" is used as "current assigned emergency" id
          assignedReport: report._id,
        },
      });
    } catch (e) {
      console.error("Failed updating ambulance:", e);
    }

    // --- 5) Update hospital bed count (respect your field names)
    try {
      if (typeof nearestHospital.bedAvailability !== "undefined") {
        await Hospital.findByIdAndUpdate(nearestHospital._id, {
          $inc: { bedAvailability: -1 },
        });
      } else if (typeof nearestHospital.availableBeds !== "undefined") {
        await Hospital.findByIdAndUpdate(nearestHospital._id, {
          $inc: { availableBeds: -1 },
        });
      } else {
        // If no bed field exists, attempt to increment currentlyAssignedAmbulances
        if (typeof nearestHospital.currentlyAssignedAmbulances !== "undefined") {
          await Hospital.findByIdAndUpdate(nearestHospital._id, {
            $inc: { currentlyAssignedAmbulances: 1 },
          });
        }
      }
    } catch (e) {
      console.error("Failed updating hospital bed count:", e);
    }

    // Return assigned objects (nearestAmbulance/hospital are raw docs from collection)
    return res.json({
      msg: "Auto-assigned successfully",
      report,
      ambulance: nearestAmbulance,
      hospital: nearestHospital,
    });
  } catch (err) {
    console.error("Auto-Assign Error:", err);
    return res.status(500).json({ msg: "Server Error" });
  }
};
