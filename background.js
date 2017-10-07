'use strict';
var reload = chrome.runtime.reload

var response = function(config, req) {
  //console.log(req.method, req.type, req.url, req.parentFrameId == -1 ? '':'iframe')
  if (req.method != "GET") {
    console.log(req.method, req.type, req.url, req.parentFrameId == -1 ? '':'iframe')
    var url = new URL(req.url)
    if (req.method == 'POST') { 
      for (var pattern of config.post_whitelist) {
        if (req.url.startsWith(pattern)) {
          console.log('not blocking POST, in whitelist')
          return
        }
      }
    } else if (req.method == 'PUT') {  
      for (var pattern of config.put_whitelist) {
        if (req.url.startsWith(pattern)) {
          console.log('not blocking PUT, in whitelist')
          return
        }
      }
    }
      
    console.warn('block request',[req.url,req.method])
    return { cancel: true };
  }
}

function setup(config) {
  chrome.webRequest.onBeforeRequest.addListener(response.bind(null,config), { urls: ['<all_urls>'] }, ['blocking'] );    
}

async function getconfig() {
  return new Promise(resolve => {
    chrome.management.getSelf( async info => {
      if (info.mayDisable) {
        // local, dev install
        console.log('getting local configuration')
        const res = await fetch('/configuration.txt')
        const config = await res.json()
        resolve(config)
      } else {
        console.log('getting managed configuration')
        // this can return empty object !!!
        // when it does so, it makes POST to https://beacons.gcp.gvt2.com/domainreliability/upload
        // so if this happens ... perhaps retry will fallback and disable everything until then ?
        chrome.storage.managed.get(null, resolve)
      }
    })
  })
}

async function delay(t) {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}

async function main() {
  // TODO -- block all requests until we get a proper config
  var config = await getconfig()
  var retries = 0
  while(true) {
    if (Object.keys(config).length == 0) {
      retries++
      var retries_in = Math.pow(2,retries)
      console.log('retry in', retry_in)
      await delay( 1000 * retry_in )
      config = await getconfig()
    } else {
      break
    }
  }
  
  console.log('got configuration',config)
  setup(config)
}

main()
