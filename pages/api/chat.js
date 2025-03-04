import OpenAI from "openai";
import axios from "axios";
import Lead from "../../models/lead";
import User from "../../models/user";
import { connectToDatabase } from "../../lib/mongodb";

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

  try {
    const { message, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
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
      try {
        const response = {
          data: {
            leads: [
              {
                _id: "891570ce299f4e1c0e462e4ef4347cfd",
                address: {
                  addressValidity: "Valid",
                  houseNumber: "41417",
                  street: "41417 N Anthem Ridge Dr",
                  city: "Phoenix",
                  county: "Maricopa",
                  state: "AZ",
                  zip: "85086",
                  zipPlus4: "1967",
                  latitude: 33.861022,
                  longitude: -112.08888,
                  countyFipsCode: "04013",
                  hash: "98bf735035cbbe7282813331c9562164",
                },
                deedHistory: [
                  {
                    buyers: ["STITZER MARIUS M", "STITZER BARBARA S"],
                    sellers: ["ANTHEM ARIZONA LLC"],
                    recordingDate: "2006-07-26T00:00:00.000Z",
                    saleDate: "2006-07-19T00:00:00.000Z",
                    documentNumber: "2006-0998260",
                    documentTypeCode: "Z",
                    documentType: "Corporation Deed",
                    salePrice: 585775,
                    newConstruction: true,
                    transactionId: "1013732079",
                  },
                  {
                    buyers: ["STITZER MARIUS M", "STITZER BARBARA S"],
                    sellers: ["ANTHEM ARIZONA LLC"],
                    recordingDate: "2006-07-26T00:00:00.000Z",
                    saleDate: "2006-07-19T00:00:00.000Z",
                    documentNumber: "2006-0998262",
                    documentTypeCode: "G",
                    documentType: "Agreement of Sale",
                    salePrice: 0,
                    transactionId: "1013732081",
                  },
                  {
                    buyers: ["JOHNSON PAUL J", "JOHNSON CINDY D"],
                    sellers: ["STITZER MARIUS M", "STITZER BARBARA S"],
                    recordingDate: "2014-06-02T00:00:00.000Z",
                    saleDate: "2014-04-21T00:00:00.000Z",
                    documentNumber: "2014.359598",
                    documentTypeCode: "S",
                    documentType: "Cash Sale Deed",
                    salePrice: 464800,
                    resale: true,
                    transactionId: "1013732082",
                  },
                  {
                    buyers: [
                      "JOHNSON BRETT CAMERON",
                      "LACHAPELLE LISA BRITTANY",
                    ],
                    sellers: ["JOHNSON PAUL JOHN", "JOHNSON CINDY DIANNE"],
                    recordingDate: "2014-10-29T00:00:00.000Z",
                    saleDate: "2014-10-19T00:00:00.000Z",
                    documentNumber: "2014-0716439",
                    documentTypeCode: "Q",
                    documentType: "Beneficiary Deed (Buyer ID = BE)",
                    salePrice: 0,
                    transactionId: "1013732080",
                  },
                  {
                    buyers: ["LOPES JOHN", "LOPES LYNN"],
                    sellers: ["JOHNSON PAUL J", "JOHNSON CINDY D"],
                    recordingDate: "2018-05-31T00:00:00.000Z",
                    saleDate: "2018-04-19T00:00:00.000Z",
                    documentNumber: "20180415922",
                    documentTypeCode: "BZ",
                    documentType: "Warranty Deed",
                    salePrice: 590000,
                    resale: true,
                    transactionId: "11466204700",
                  },
                ],
                demographics: {
                  age: 70,
                  income: 244000,
                  netWorth: 562500,
                  discretionaryIncome: 87750,
                  homeownerRenterCode: "O",
                  homeownerRenter: "Home Owner",
                  genderCode: "M",
                  gender: "Male",
                  investments: [
                    "Personal",
                    "Stocks and Bonds",
                    "Investment Properties",
                  ],
                  maritalStatusCode: "M",
                  maritalStatus: "Married",
                  petOwner: true,
                  religious: true,
                  religiousAffiliationCode: "C",
                  religiousAffiliation: "Catholic",
                  individualEducationCode: "F",
                  individualEducation: "Did Not Complete High School",
                  individualOccupation: "Professional / Technical",
                  individualOccupationCode: "1",
                },
                foreclosure: {},
                ids: { apn: "211-22-249" },
                mls: {
                  mlsNumber: "5745622",
                  status: "Sold",
                  price: 595000,
                  daysOnMarket: 64,
                  originalListingDate: "2018-03-28T00:00:00.000Z",
                  statusSubtype: "Closed",
                  soldPrice: 590000,
                  soldDate: "2018-05-31T00:00:00.000Z",
                  bedroomCount: 4,
                  bathroomCount: 4,
                  lotSizeSquareFeet: 11151,
                  floorCount: 1,
                  propertyType: "Residential",
                  propertySubtype: "Single Family Residence",
                  yearBuilt: 2006,
                  appliances: ["Dryer", "Washer"],
                  exteriorConstruction: "Stone, Stucco",
                  patio: "Covered, Patio",
                  roofTypes: ["Tile", "Concrete"],
                  coolingTypes: ["Ceiling Fan(s)"],
                  heatingTypes: ["Natural Gas"],
                  architecturalStyle: "Spanish",
                  description:
                    "Sellers have put approximately $100K into this home since purchasing it in 2014~ extensive backyard improvements including travertine pavers, built-in bbq, granite bar area, trellis, all new landscaping, outdoor shower.  You will be captivated by the tranquility of the backyard oasis. Complete landscape design of front yard.  Family room with fireplace hearth, stone surround, entertainment niches, and remodeled bar area with wine fridge. This absolutely gorgeous and sought-after Monterey model has 4 bedrooms, 3 1/2 baths, formal living/dining, eat in kitchen with beautiful slab granite with chiseled edges plus full backsplash. 5'' baseboards, plantation shutters, upgraded baths, and travertine flooring throughout with 3 ''Love'' medallions. Newer carpet in bedrooms. Private backyard has heated pool/spa with stone water feature, 4 fire pots and imported glass tile surround at pool and spa, mountain views, and east exposure for morning sun!  Lovely front courtyard too!  Exceptional home!!",
                  directions:
                    "Enter Anthem Hills gate, right on Ainsworth, left on Anthem Ridge to home on right.",
                  mlsId: "ArizonaRegional",
                  mlsName: "Arizona Regional Multiple Listing Service (ARMLS)",
                  livingArea: 2981,
                  agentOffices: [
                    {
                      agentCodeId: "reax40",
                      key: "1069932811158786972",
                      mainOfficeId: "reax01",
                      name: "Realty Executives",
                      officeAddress:
                        "Suite G-101, 23415 N Scottsdale Rd, Scottsdale, AZ, 85255",
                      officeEmail: "dpatricklewis@gmail.com",
                      officePhoneNumber: "4805850101",
                      fax: "4805851571",
                    },
                    {
                      agentCodeId: "reog14",
                      key: "1064839232787019302",
                      mainOfficeId: "reog03",
                      name: "Realty ONE Group",
                      officeAddress:
                        "#160, 17550 N Perimeter Dr, Scottsdale, AZ, 85255",
                      officeEmail: "ron.copus@realtyonegroup.com",
                      officePhoneNumber: "4802850000",
                    },
                  ],
                  taxes: [{ amount: 4735, year: 2017 }],
                  schools: [
                    {
                      category: "Elementary",
                      district: "Deer Valley Unified District",
                      name: "Diamond Canyon Elementary",
                    },
                    { category: "Middle", name: "Diamond Canyon Elementary" },
                    {
                      category: "High",
                      district: "Deer Valley Unified District",
                      name: "Boulder Creek High School",
                    },
                  ],
                  subDivision: "ANTHEM UNIT 42",
                  agents: [
                    {
                      email: "jtetsell@gmail.com",
                      key: "1062577899782703874",
                      licenseNumber: "SA569340000",
                      name: "Jill Tetsell",
                      officePhoneNumber: "4802039066",
                      primaryPhoneNumber: "4802039066",
                      roles: ["Listing Agent"],
                    },
                    {
                      email: "dick@tetsellaz.com",
                      key: "1062583530874759599",
                      licenseNumber: "SA560600000",
                      name: "Dick Tetsell",
                      primaryPhoneNumber: "4802276578",
                      roles: ["Listing Agent"],
                    },
                    {
                      email: "lisa@lisahalman.com",
                      key: "1060541049846466765",
                      licenseNumber: "SA550121000",
                      name: "Lisa M Halman",
                      primaryPhoneNumber: "6234515274",
                      roles: ["Buyer Agent"],
                    },
                  ],
                  salePriceIsEstimated: false,
                  statusUpdatedAt: "2018-05-31T18:38:05.000Z",
                },
                mortgageHistory: [
                  {
                    borrowers: ["STITZER MARIUS M", "STITZER BARBARA S"],
                    saleDate: "2009-08-06T00:00:00.000Z",
                    recordingDate: "2009-08-13T00:00:00.000Z",
                    dueDate: "2039-09-01T00:00:00.000Z",
                    lenderName: "NOVA FINANCIAL & INVESTMENT CORP",
                    loanTypeCode: "AH",
                    loanType: "Unknown (DEFAULT)",
                    loanAmount: 384000,
                    loanTermMonths: 360,
                    interestRate: 5.17,
                  },
                  {
                    borrowers: ["STITZER MARIUS M", "STITZER BARBARA S"],
                    saleDate: "2013-01-04T00:00:00.000Z",
                    recordingDate: "2013-02-01T00:00:00.000Z",
                    dueDate: "2043-02-01T00:00:00.000Z",
                    lenderName: "CRESTAR MORTGAGE",
                    loanTypeCode: "U",
                    loanType: "New Conventional",
                    loanAmount: 366800,
                    loanTermMonths: 360,
                    interestRate: 3.31,
                  },
                  {
                    borrowers: ["LOPES JOHN", "LOPES LYNN"],
                    saleDate: "2020-04-03T00:00:00.000Z",
                    recordingDate: "2020-04-10T00:00:00.000Z",
                    dueDate: "2050-05-01T00:00:00.000Z",
                    lenderName: "FINANCE OF AMERICA MORTGAGE LLC",
                    loanTypeCode: "U",
                    loanType: "New Conventional",
                    loanAmount: 425600,
                    loanTermMonths: 360,
                    interestRate: 3.2,
                  },
                ],
                openLien: {
                  allLoanTypes: ["New Conventional"],
                  totalOpenLienCount: 1,
                  totalOpenLienBalance: 384733,
                  firstLoanRecordingDate: "2020-04-10T00:00:00.000Z",
                  lastLoanRecordingDate: "2020-04-10T00:00:00.000Z",
                  mortgages: [
                    {
                      recordingDate: "2020-04-10T00:00:00.000Z",
                      loanTypeCode: "U",
                      loanType: "New Conventional",
                      dueDate: "2050-05-01T00:00:00.000Z",
                      loanAmount: 425600,
                      lenderName: "FINANCE OF AMERICA MORTGAGE LLC",
                      loanTermMonths: 360,
                      currentEstimatedBalance: 384733,
                      currentEstimatedInterestRate: 3.47,
                      assignedLenderName: "FINANCE OF AMERICA MORTGAGE LLC",
                      ltv: 40.4062,
                      estimatedPaymentAmount: 1904,
                    },
                  ],
                },
                owner: {
                  fullName: "John Lopes; Lynn Lopes",
                  mailingAddress: {
                    addressValidity: "Valid",
                    street: "41417 N Anthem Ridge Dr",
                    city: "Phoenix",
                    county: "Maricopa",
                    state: "AZ",
                    zip: "85086",
                    zipPlus4: "1967",
                  },
                  names: [
                    { first: "John", last: "Lopes", full: "John Lopes" },
                    { first: "Lynn", last: "Lopes", full: "Lynn Lopes" },
                  ],
                },
                propertyOwnerProfile: {
                  averagePurchasePrice: 590000,
                  averageYearBuilt: 2006,
                  propertiesCount: 1,
                  propertiesTotalEquity: 567430,
                  propertiesTotalEstimatedValue: 952163,
                  mortgagesTotalBalance: 384733,
                  mortgagesCount: 1,
                  mortgagesAverageBalance: 384733,
                  totalPurchasePrice: 590000,
                },
                quickLists: {
                  absenteeOwner: false,
                  absenteeOwnerInState: false,
                  absenteeOwnerOutOfState: false,
                  activeListing: false,
                  activeAuction: false,
                  cashBuyer: false,
                  corporateOwned: false,
                  expiredListing: false,
                  freeAndClear: false,
                  forSaleByOwner: false,
                  highEquity: true,
                  inherited: false,
                  listedBelowMarketPrice: true,
                  lowEquity: false,
                  mailingAddressVacant: false,
                  onMarket: false,
                  outOfStateOwner: false,
                  ownerOccupied: true,
                  pendingListing: false,
                  preforeclosure: false,
                  recentlySold: false,
                  samePropertyAndMailingAddress: true,
                  taxDefault: false,
                  tiredLandlord: false,
                  unknownEquity: false,
                  vacant: false,
                  vacantLot: false,
                  hasHoa: true,
                  hasHoaFees: true,
                  canceledListing: false,
                  noticeOfSale: false,
                  noticeOfDefault: false,
                  noticeOfLisPendens: false,
                },
                sale: {
                  lastSale: {
                    mortgages: [
                      {
                        documentNumber: "20180415923",
                        pageNumber: null,
                        bookNumber: null,
                        recordingDate: "2018-05-31T00:00:00.000Z",
                        loanAmount: 430000,
                        loanTypeCode: "U",
                        loanType: "New Conventional",
                        financingTypeCode: null,
                        financingType: null,
                        interestRate: 4.4,
                        dueDate: "2048-06-01T00:00:00.000Z",
                        lenderName: "FINANCE OF AMERICA MORTGAGE LL",
                        loanTerm: "360",
                      },
                    ],
                  },
                },
                valuation: {
                  estimatedValue: 952163,
                  priceRangeMin: 895033,
                  priceRangeMax: 1009292,
                  standardDeviation: 6,
                  confidenceScore: 94,
                  asOfDate: "2025-01-08T00:00:00.000Z",
                  equityCurrentEstimatedBalance: 567430,
                  ltv: 40.4,
                  equityPercent: 59.6,
                },
              },
            ],
          },
        };
        // await axios.get(
        //   `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leads`,
        //   {
        //     params: analysis.parameters,
        //   }
        // );

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

        // Helper function to send SSE data
        const sendSSE = (data) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        for (const chunk of formattedResponse.match(/.{1,50}/g) || []) {
          sendSSE({ content: chunk });
        }

        return res.json({ content: formattedResponse });
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Error processing leads request." });
      }
    } else {
      return res.json({
        content:
          "I can help you find leads. Please ask about properties in a specific location.",
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
