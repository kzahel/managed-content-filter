var reload = chrome.runtime.reload
var urls = [
  '*://*.google-analytics.com/*', // example
];
urls = ["<all_urls>"]

var response = function(req) {
  if (req.method != "GET") {
    console.log('blocking',req)
    return { cancel: true };
  }
}

var k = "OnlyGETDomains"
chrome.storage.managed.get(k, d => {
  if (d[k]) {
    chrome.webRequest.onBeforeRequest.addListener(response, { urls: d[k] }, ['blocking'] );    
  }
})
