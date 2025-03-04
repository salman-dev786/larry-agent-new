export default function handler(req, res) {
  const CLIENT_ID = process.env.CLICKFUNNELS_CLIENT_ID;
  const REDIRECT_URI = process.env.CLICKFUNNELS_REDIRECT_URI;

  const authUrl = `https://accounts.myclickfunnels.com/oauth/authorize?client_id=${CLIENT_ID}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}&response_type=code&new_installation=true`;

  return res.redirect(authUrl);
}
