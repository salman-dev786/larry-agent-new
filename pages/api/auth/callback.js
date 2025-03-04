import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/user";
import axios from "axios";

export default async function handler(req, res) {
  await connectToDatabase();

  const { code } = req.query;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, error: "Authorization code missing" });
  }

  try {
    const TOKEN_URL = "https://accounts.myclickfunnels.com/oauth/token";
    const CLIENT_ID = process.env.CLICKFUNNELS_CLIENT_ID;
    const CLIENT_SECRET = process.env.CLICKFUNNELS_CLIENT_SECRET;
    const REDIRECT_URI = process.env.CLICKFUNNELS_REDIRECT_URI;
    const Website_URI = process.env.Website_URI;

    const response = await axios.post(
      TOKEN_URL,
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
        grant_type: "authorization_code",
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = response.data;

    let user = await User.findOne({ email: data?.email });

    if (!user) {
      user = new User({
        name: data?.team_name,
        access_token: data?.access_token,
        expires_in: data?.expires_in,
        permissions: [],
      });

      await user.save();
    } else {
      user.access_token = data?.access_token;
      user.expires_in = data?.expires_in;
      await user.save();
    }

    if (data?.access_token) {
      return res.redirect(`${Website_URI}?token=${data.access_token}`);
    } else {
      return res.status(400).json({ error: "Token exchange failed" });
    }
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
