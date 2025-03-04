import OpenAI from "openai";
import axios from "axios";
import Lead from "../../models/lead";
import User from "../../models/user";
import { connectToDatabase } from "../../lib/mongodb";
import { getCurrentUrl } from "./auth/callback";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const API_PARAMETER_EXTRACTION_MESSAGE = {
  role: "system",
  content: `You are a lead search parameter extractor. Extract location parameters from user messages.

Output format (JSON):
{
    "parameters": {
        "state": "two letter state code or null",
        "city": "city name or null",
        "zip": "5-digit zip code or null",
        "street": "street address or null",
    },
    "shouldSearchLeads": boolean,
    "searchReason": "brief explanation"
}

Rules:
1. Convert location abbreviations (e.g., "LA" → "Los Angeles")
2. Set shouldSearchLeads true if user wants to find/see/get leads or properties
3. Include searchReason explaining the decision
4. Only include parameters that are clearly specified`,
};

const extractSearchParameters = async (message) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        API_PARAMETER_EXTRACTION_MESSAGE,
        { role: "user", content: message },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to analyze query");
  }
};

const formatLeadsForDisplay = (leads, location) => {
  if (!leads || leads.length === 0) {
    return `No leads available in ${location.city || ""} ${
      location.state || ""
    }`.trim();
  }
  return leads
    .map((lead) => {
      const address = lead.address || {};
      const owner =
        lead.deedHistory?.length > 0
          ? lead.deedHistory[lead.deedHistory.length - 1].buyers.join(", ")
          : "Unknown";
      return `- **Address**: ${address.houseNumber || ""} ${
        address.street || ""
      }, ${address.city || ""}, ${address.state || ""} ${
        address.zip || ""
      }\n**Owner**: ${owner}\n**Mailing**: ${address.city || ""}, ${
        address.state || ""
      } ${address.zip || ""}`;
    })
    .join("\n");
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectToDatabase();

  // Helper function to send SSE data
  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { message, userId } = req.body;
    if (!message) {
      sendSSE({ error: "Message is required" });
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      sendSSE({ error: "User not found" });

      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const startOfWeek = new Date(
      now.setDate(now.getDate() - now.getDay() + 1)
    ).setHours(0, 0, 0, 0);
    if (!user.lastRequestDate || new Date(user.lastRequestDate) < startOfWeek) {
      user.leadRequests = 0;
    }

    if (user.leadRequests >= user.leadsPerWeek) {
      sendSSE({ error: "Lead request limit reached for this week" });
      return res
        .status(403)
        .json({ error: "Lead request limit reached for this week" });
    }

    user.leadRequests += 1;
    user.lastRequestDate = new Date();
    await user.save();

    const analysis = await extractSearchParameters(message);
    const requiredParams = ["state", "city", "zip", "street"];
    const missingParams = requiredParams.filter(
      (param) => !analysis.parameters[param]
    );

    if (analysis.shouldSearchLeads && missingParams.length === 0) {
      const backendUrl = getCurrentUrl(req);
      console.log("backendUrl", backendUrl);
      try {
        const response = await axios.get(
          `${backendUrl}/api/leads`,
          {
            params: analysis.parameters,
          },
          {
            validateStatus: false,
          }
        );

        if (!response.data?.leads) {
          throw new Error("Invalid response format from leads API");
        }

        const storedLeads = await Promise.all(
          response.data.leads.map(async (lead) => {
            if (
              !analysis.parameters.street ||
              !analysis.parameters.city ||
              !analysis.parameters.state ||
              !analysis.parameters.zip
            ) {
              return null;
            }
            return await Lead.create({
              userId,
              location: analysis.parameters,
              data: lead,
            });
          })
        );

        if (storedLeads.every((item) => item === null)) {
          return res.json({
            content: "No lead found in the specific location.",
          });
        }

        const formattedResponse = formatLeadsForDisplay(
          response.data.leads,
          analysis.parameters
        );

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");

        for (const chunk of formattedResponse.match(/.{1,50}/g) || []) {
          sendSSE({ content: chunk });
        }

        return res.json({ content: formattedResponse });
      } catch (error) {
        console.log("Error lead req", error);
        sendSSE({ error: "Error processing leads request." });
        return res
          .status(500)
          .json({ error: "Error processing leads request." });
      }
    } else {
      sendSSE({
        content:
          "I can help you find leads. Please ask about properties in a specific location.",
      });
      return res.json({
        content:
          "I can help you find leads. Please ask about properties in a specific location.",
      });
    }
  } catch (error) {
    console.log("Error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
