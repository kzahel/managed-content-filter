'use strict';
var reload = chrome.runtime.reload

function frameresponse(config, req) {
  if (! config.whitelist) {
    return { cancel: true }
  }

  var url = new URL(req.url)

  console.log('new frame req',req.method,req.type,url.href)

  // treat sub_frame (iframe) same as top level frames. possibly whitelist iframes for certain "very trusted" domains.

  
}

var response = function(config, req) {
  //console.log(req.method, req.type, req.url, req.parentFrameId == -1 ? '':'iframe')
  if (req.method != "GET") {
    console.log(req.method, req.type, req.url, req.parentFrameId == -1 ? '':'iframe')
    var url = new URL(req.url)
    if (config.post_whitelist && req.method == 'POST') { 
      for (var pattern of config.post_whitelist) {
        if (req.url.startsWith(pattern)) {
          console.log('not blocking POST, in whitelist')
          return
        }
      }
    } else if (config.put_whitelist && req.method == 'PUT') {  
      for (var pattern of config.put_whitelist) {
        if (req.url.startsWith(pattern)) {
          console.log('not blocking PUT, in whitelist')
          return
        }
      }
    }
    console.warn('block request',req.method,req.url)
    return { cancel: true };
  }
}

function setup(config) {
  chrome.webRequest.onBeforeRequest.addListener(response.bind(null,config), { urls: ['<all_urls>'] }, ['blocking'] );

  // this emulates the admin console filtering that applies to top level frames and iframes
  chrome.webRequest.onBeforeRequest.addListener(frameresponse.bind(null,config),
                                                { types: ['main_frame','sub_frame'],
                                                  urls: ['<all_urls>'] },
                                                ['blocking'] );
}

const oMap = (o, f) => Object.assign(...Object.keys(o).map(k => ({ [k]: f(o[k]) })))

async function getconfig() {
  return new Promise(resolve => {
    chrome.management.getSelf( async info => {
      if (info.mayDisable) {
        // local, dev install
        console.log('getting local configuration')
        const res = await fetch('/filter_configuration.txt')
        const rawconfig = await res.json()
        const config = oMap( rawconfig, v => v.Value )
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
  // TODO -- refresh the managed policy every {x} minutes ?
  // TODO -- block all requests until we get a proper config
  var config = await getconfig()
  var retries = 0
  while(true) {
    if (!config || Object.keys(config).length == 0) {
      retries++
      var retries_in = Math.pow(2,retries)
      console.log('got empty config',config,'retry in', retry_in)
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
