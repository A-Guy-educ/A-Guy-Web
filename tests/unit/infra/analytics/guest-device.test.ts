import { describe, expect, it } from 'vitest'

import { classifyGuestDevice, parseGuestDevice } from '@/infra/analytics/guest-device'

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.32.112 (iPhone14,5; iOS 17_5; he_IL; he; scale=3.00; 1170x2532; 551281210)',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/466.0.0.48.110;]',
  androidTikTok:
    'Mozilla/5.0 (Linux; Android 13; SM-A536B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 trill_2023405030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.5.3',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  chromebook:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

describe('classifyGuestDevice', () => {
  it.each([
    ['iphoneSafari', 'ios', null],
    ['iphoneInstagram', 'ios', 'instagram'],
    ['androidChrome', 'android', null],
    ['androidFacebook', 'android', 'facebook'],
    ['androidTikTok', 'android', 'tiktok'],
    ['androidWebView', 'android', 'other_app'],
    ['windowsChrome', 'computer', null],
    ['chromebook', 'computer', null],
  ] as const)('%s -> %s / %s', (key, platform, inApp) => {
    expect(classifyGuestDevice(UA[key])).toEqual({ platform, inApp })
  })

  it('falls back to other with no UA', () => {
    expect(classifyGuestDevice(null)).toEqual({ platform: 'other', inApp: null })
  })
})

describe('parseGuestDevice', () => {
  it('accepts a well-formed device and rejects anything else', () => {
    expect(parseGuestDevice({ platform: 'ios', inApp: 'instagram' })).toEqual({
      platform: 'ios',
      inApp: 'instagram',
    })
    expect(parseGuestDevice({ platform: 'ios', inApp: null })).toEqual({
      platform: 'ios',
      inApp: null,
    })
    expect(parseGuestDevice({ platform: 'watch', inApp: null })).toBeNull()
    expect(parseGuestDevice({ platform: 'ios', inApp: 'myspace' })).toBeNull()
    expect(parseGuestDevice('ios')).toBeNull()
    expect(parseGuestDevice(undefined)).toBeNull()
  })
})
