import { connectToDatabase } from "../../lib/mongodb";
import Text from "../../models/Text";

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method === "POST") {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "Text is required" });

      const newText = await Text.create({ text });
      return res.status(201).json(newText);
    } catch (error) {
      return res.status(500).json({ message: "Error inserting text" });
    }
  }

  if (req.method === "GET") {
    try {
      const texts = await Text.find().sort({ createdAt: -1 });
      return res.status(200).json(texts);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching texts" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
