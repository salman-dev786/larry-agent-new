function getBaseUrl(url) {
  const match = url.match(/^https?:\/\/([^/]+\.app)/);
  return match ? match[0] : null;
}
export function getCurrentUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http"; // Detect HTTPS if behind a proxy
  const host = req.headers.host; // Get the host
  const url = `${protocol}://${host}${req.url}`; // Construct full URL
  const baseUrl = getBaseUrl(url);
  return baseUrl;
}
export default function handler(req, res) {
  const CLIENT_ID = process.env.CLICKFUNNELS_CLIENT_ID;
  //   const REDIRECT_URI = process.env.CLICKFUNNELS_REDIRECT_URI;
  const REDIRECT_URI = getCurrentUrl(req) + "/api/auth/callback";

  const authUrl = `https://accounts.myclickfunnels.com/oauth/authorize?client_id=${CLIENT_ID}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}&response_type=code&new_installation=true`;

  return res.redirect(authUrl);
}
