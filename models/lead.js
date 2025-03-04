const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    location: {
      type: Object,
      default: {},
    },
    data: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const Lead = mongoose.models.lead || mongoose.model("lead", LeadSchema);
module.exports = Lead;
