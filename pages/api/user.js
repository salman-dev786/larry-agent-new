import User from "../../models/user";
import { connectToDatabase } from "../../lib/mongodb";

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method === "GET") {
    try {
      const { accessToken } = req.query;

      if (!accessToken) {
        return res.status(400).json({ error: "Access token is required" });
      }

      // Find user in DB
      let user = await User.findOne({ access_token: accessToken });

      if (!user) {
        return res.status(404).json({ data: "not found" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
