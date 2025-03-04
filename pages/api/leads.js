import axios from "axios";

const BATCHDATA_API_TOKEN = process.env.BATCHDATA_API_TOKEN;
const BATCHDATA_API_URL = "https://api.batchdata.com/api/v1/property/search";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("=== Processing Lead Search Request ===");
    console.log("Query parameters:", req.query);

    const { state, city, zip, street, query } = req.query;

    if (
      !BATCHDATA_API_TOKEN ||
      BATCHDATA_API_TOKEN === "your_batchdata_api_token"
    ) {
      console.error("BatchData API token not properly configured");
      return res.status(500).json({
        error:
          "BatchData API token is missing or incorrect. Set BATCHDATA_API_TOKEN in .env file.",
      });
    }

    // Construct the search data object
    const searchData = {
      searchCriteria: {
        query: query || (city && state ? `${city}, ${state}` : undefined),
        compAddress: {},
      },
      options: {
        useYearBuilt: true,
        skip: 0,
        take: 1,
      },
    };

    // Add address details if provided
    if (street) searchData.searchCriteria.compAddress.street = street;
    if (city) searchData.searchCriteria.compAddress.city = city;
    if (state)
      searchData.searchCriteria.compAddress.state = state.toUpperCase();
    if (zip) searchData.searchCriteria.compAddress.zip = zip;

    // Validate that at least one search criterion is provided
    if (
      !searchData.searchCriteria.query &&
      Object.keys(searchData.searchCriteria.compAddress).length === 0
    ) {
      return res.status(400).json({
        error:
          "Search requires either a query parameter or location details (city, state, etc.).",
      });
    }

    console.log("Sending request to BatchData API:", {
      url: BATCHDATA_API_URL,
      data: JSON.stringify(searchData, null, 2),
    });

    // Call BatchData API
    const response = await axios.post(BATCHDATA_API_URL, searchData, {
      headers: {
        Authorization: `Bearer ${BATCHDATA_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
      },
      validateStatus: false,
    });

    console.log("BatchData API response:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: `BatchData API returned status ${response.status}`,
        details: response.data,
      });
    }

    // Extract relevant leads data
    const leads = response.data?.results?.properties || [];
    console.log(`Found ${leads.length} leads`);

    res.status(200).json({
      leads,
      metadata: {
        total: response.data?.total || leads.length,
        page: Math.floor(searchData.options.skip / searchData.options.take) + 1,
        limit: searchData.options.take,
      },
    });
  } catch (error) {
    console.error("Error processing lead search request:", error);

    let statusCode = 500;
    let errorMessage = "Failed to fetch leads from BatchData";

    if (error.response?.status) {
      statusCode = error.response.status;
      errorMessage = error.response?.data?.message || error.message;
    }

    res.status(statusCode).json({
      error: "BatchData API Error",
      message: errorMessage,
    });
  }
}
