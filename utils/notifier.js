// utils/notifier.js

let io = null;

// ============================================================
// 🔌 INITIALIZE SOCKET.IO INSTANCE
// ============================================================
exports.init = (ioInstance) => {
  io = ioInstance;
  console.log("🔔 Notifier initialized successfully");
};

// ============================================================
// 📡 BROADCAST TO A SPECIFIC ROOM
// ============================================================
exports.broadcastToRoom = (roomId, event, data) => {
  if (!io) {
    console.warn("⚠️ Socket.IO instance not initialized in notifier.");
    return;
  }

  if (!roomId) {
    console.warn("⚠️ Missing roomId in notifier broadcast.");
    return;
  }

  io.to(roomId).emit(event, data);
};

// ============================================================
// 📢 BROADCAST TO ALL CONNECTED ADMINS
// ============================================================
exports.broadcastToAdmins = (event, data) => {
  if (!io) return;
  io.to("control-center").emit(event, data);
};

// ============================================================
// 📦 BUILD STANDARD STATUS PAYLOAD FROM EMERGENCY DOC
// ============================================================
exports.buildStatusPayload = (emergency) => {
  if (!emergency) return null;

  return {
    emergencyId: emergency._id.toString(),
    status: emergency.status,
    eta: emergency.eta || null,
    updatedAt: emergency.updatedAt || new Date(),
  };
};

// ============================================================
// 🔁 BROADCAST STATUS UPDATE TO ALL RELEVANT ROOMS
// ============================================================
exports.broadcastStatusUpdate = (emergency) => {
  if (!io || !emergency) return;

  const payload = exports.buildStatusPayload(emergency);
  if (!payload) return;

  // Admin (control center)
  io.to("control-center").emit("status-update", payload);

  // Assigned hospital
  if (emergency.assignedHospital) {
    const hospId =
      typeof emergency.assignedHospital === "object"
        ? emergency.assignedHospital._id.toString()
        : emergency.assignedHospital.toString();
    io.to(hospId).emit("status-update", payload);
  }

  // Assigned ambulance
  if (emergency.assignedAmbulance) {
    const ambId =
      typeof emergency.assignedAmbulance === "object"
        ? emergency.assignedAmbulance._id.toString()
        : emergency.assignedAmbulance.toString();
    io.to(ambId).emit("status-update", payload);
  }

  // Citizen tracking page (tracking token as room id)
  if (emergency.trackingToken) {
    io.to(emergency.trackingToken).emit("status-update", payload);
  }
};
