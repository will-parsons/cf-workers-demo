//const jwt = require('jsonwebtoken');

/**
 * Parse and decode a JWT.
 * A JWT is three, base64 encoded, strings concatenated with ‘.’:
 *   a header, a payload, and the signature.
 * The signature is “URL safe”, in that ‘/+’ characters have been replaced by ‘_-’
 * 
 * Steps:
 * 1. Split the token at the ‘.’ character
 * 2. Base64 decode the individual parts
 * 3. Retain the raw Bas64 encoded strings to verify the signature
 *  Borrowed from https://gist.github.com/bcnzer/e6a7265fd368fa22ef960b17b9a76488 
*/
function decodeJwt(token) {
  const parts = token.split('.');
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));
  const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'));
  console.log(header)
  return {
    header: header,
    payload: payload,
    signature: signature,
    raw: { header: parts[0], payload: parts[1], signature: parts[2] }
  }
}


export default {
  async fetch(request, env, ctx) {

    // if the request is "/secure/XX" (two letter country code) then handle the response differently. 
    const urlPath = new URL(request.url).pathname;
    const countryRegExp = new RegExp(/(secure\/)[a-zA-Z]{2}$/);
    if (countryRegExp.test(urlPath)) {
      // take the last two characters, and make them lowercase because my flag files are named "ab.png"
      let country = urlPath.slice(-2).toLowerCase();
      // get the flag from the bucket
      const object = await env.FLAGS_BUCKET.get(`${country}.png`);
      // to handle anything missing or not a real country code
      if (object === null) {
          return new Response('Object Not Found', { status: 404 });
      }
      //return the file's contents with the appropriate content-type
      return new Response(object.body, {
	      headers: { "content-type": "image/png" },
      });
    }


    //get the JWT header, parse it, and assign variables	  
    const jwtHeader = request.headers.get("Cf-Access-Jwt-Assertion"); 
    const jwtDecoded = decodeJwt(jwtHeader);
    const jwtEmail = jwtDecoded.payload.email;
    const jwtIssuedAtTime = jwtDecoded.payload.iat;
    const jwtCountry = jwtDecoded.payload.country;
    const localTimestamp = new Date(jwtIssuedAtTime * 1000)

    let responseBody = "";
    responseBody = responseBody.concat("<html><title>Worker demo</title><body><h1>Worker Demo</h1>");
    responseBody = responseBody.concat(`${jwtEmail} authenticated at ${localTimestamp} from <a href=/secure/${jwtCountry}>${jwtCountry}</a>`);
    responseBody = responseBody.concat(`<br />URL path was: ${urlPath} `);
    responseBody = responseBody.concat("</body></html>");


    return new Response(responseBody, {
      	headers: {
        "content-type": "text/html",
      },
    });
  },
};
