import axios from "axios";

const BATCHDATA_API_TOKEN = process.env.BATCHDATA_API_TOKEN;
const BATCHDATA_API_URL = "https://api.batchdata.com/api/v1/property/search";

export async function fetchLeads(searchParams) {
  try {
    console.log("params", searchParams);
    console.log(
      "BATCHDATA_API_TOKEN:",
      BATCHDATA_API_TOKEN ? "Exists" : "MISSING"
    );

    if (!BATCHDATA_API_TOKEN) {
      throw new Error(
        "BatchData API token is missing or incorrect. Set BATCHDATA_API_TOKEN in .env file."
      );
    }

    const { state, city, zip, street, query } = searchParams;

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
      throw new Error(
        "Search requires either a query parameter or location details (city, state, etc.)."
      );
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
      throw new Error(
        `BatchData API returned status ${response.status}: ${JSON.stringify(
          response.data
        )}`
      );
    }

    // Extract relevant leads data
    const leads = response.data?.results?.properties || [];
    console.log(`Found ${leads.length} leads`);

    return {
      leads,
      metadata: {
        total: response.data?.total || leads.length,
        page: Math.floor(searchData.options.skip / searchData.options.take) + 1,
        limit: searchData.options.take,
      },
    };
  } catch (error) {
    console.error("Error processing lead search request:", error.message);
    throw new Error(error.message || "Failed to fetch leads from BatchData");
  }
}
