/**
 * Minimal desktop preload. The first desktop release inherits Web features
 * through the loopback Web app; the bridge is reserved for typed desktop
 * capabilities that cannot safely ride HTTP.
 */

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('dshDesktop', {
  version: 1,
})
