/**
 * Device Utilities - Collect device information for sync
 */

import type { DeviceInfo } from './types';
import { generateUUID } from '../utils/uuid';

const DEVICE_ID_KEY = 'sync_device_id';
const APP_VERSION = '1.0.0';

/**
 * Get or create a persistent device ID
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detect device type based on screen size and user agent
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.screen.width;

  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/.test(ua) || (width >= 600 && width <= 1024)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Parse OS information from user agent
 */
export function getOSInfo(): { os: string; version: string } {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  let version = '';

  if (/Windows NT 10/.test(ua)) {
    os = 'Windows';
    version = '10';
  } else if (/Windows NT 11/.test(ua)) {
    os = 'Windows';
    version = '11';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    version = match ? match[1].replace('_', '.') : '';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android (\d+\.?\d*)/);
    version = match ? match[1] : '';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS (\d+_\d+)/);
    version = match ? match[1].replace('_', '.') : '';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    version = '';
  }

  return { os, version };
}

/**
 * Parse browser information from user agent
 */
export function getBrowserInfo(): { browser: string; version: string } {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = '';

  if (/Edg\//.test(ua)) {
    browser = 'Edge';
    const match = ua.match(/Edg\/(\d+\.?\d*)/);
    version = match ? match[1] : '';
  } else if (/Chrome\//.test(ua)) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.?\d*)/);
    version = match ? match[1] : '';
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.?\d*)/);
    version = match ? match[1] : '';
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
    const match = ua.match(/Version\/(\d+\.?\d*)/);
    version = match ? match[1] : '';
  }

  return { browser, version };
}

/**
 * Get device name (user-friendly string)
 */
export function getDeviceName(): string {
  const type = getDeviceType();
  const { os } = getOSInfo();
  const { browser } = getBrowserInfo();

  return `${os} ${type} (${browser})`;
}

/**
 * Collect complete device information
 */
export function collectDeviceInfo(): DeviceInfo {
  const { os, version: osVersion } = getOSInfo();
  const { browser, version: browserVersion } = getBrowserInfo();

  return {
    device_id: getDeviceId(),
    device_name: getDeviceName(),
    device_type: getDeviceType(),
    os,
    os_version: osVersion,
    browser,
    browser_version: browserVersion,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    user_agent: navigator.userAgent,
    app_version: APP_VERSION,
  };
}
