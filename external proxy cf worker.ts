const proxyKey = '1234'; // Your secret key for the client to use this proxy

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response) {
  const { headers } = response
  const contentType = headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json())
  }
  else if (contentType.includes("application/text")) {
    return await response.text()
  }
  else if (contentType.includes("text/html")) {
    return await response.text()
  }
  else {
    return await response.text()
  }
}

/**
 * @param {Request} req
 */
async function dapiFetch(req) {
  const apiUrl = req.headers.get('api-url');
  let headers = req.headers;
  delete headers['proxy-key'];
  delete headers['api-url'];
  const init = {
    headers: headers,
    method: req.method,
    body: req.body
  }
  const response = await fetch(`https://discord.com/api/${apiUrl}`, init)
  return response;
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const key = request.headers.get('proxy-key');
  if(!key || key !== proxyKey) {
    return new Response('', {status: 403});
  }
  const resp = await dapiFetch(request);
  if(resp.status !== 204) {
    const body = await gatherResponse(resp);
    return new Response(body, {status: resp.status, statusText: resp.statusText})
  }
  return new Response('', {status: resp.status, statusText: resp.statusText})
}