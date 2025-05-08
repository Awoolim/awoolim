import { app, shell, BrowserWindow, ipcMain, IpcMainEvent, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { GoogleGenAI } from '@google/genai'
import * as tf from '@tensorflow/tfjs'
import * as tflite from 'tfjs-tflite-node'
import Store from 'electron-store'
import consola from 'consola'
import sharp from 'sharp'
import os from 'os'
import icon from '../../resources/icon.png?asset'
import { _ } from 'svelte-i18n'

const store = new Store()

let isStarted = 0

let userData: userData = {
  language: 'en',
  name: '',
  age: 0,
  gender: 'unspecified',
  conditions: [],
  goals: []
}

function createMainWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/main/index.html`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/main/index.html'))
  }
}

function createSetupWindow(): void {
  const setupWindow = new BrowserWindow({
    width: 900,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  setupWindow.on('ready-to-show', () => {
    setupWindow.show()
  })

  setupWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    setupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/setup/index.html`)
  } else {
    setupWindow.loadFile(join(__dirname, '../renderer/setup/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  consola.box('Awoolim is starting up...')
  consola.info('App version:', app.getVersion())
  consola.info('Node version:', process.versions.node)
  consola.info('Chromium version:', process.versions.chrome)
  consola.info('Electron version:', process.versions.electron)
  consola.info('OS version:', process.platform, process.getSystemVersion())
  consola.info('OS architecture:', process.arch)

  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  isStarted = os.uptime()

  if (store.get('userData') == undefined) {
    consola.warn('User data not found, creating setup window')
    ipcMain.on('get-permission-state', sendPermissionState)
    ipcMain.on('ask-permission', askPermission)
    ipcMain.on('setup-complete', setupComplete)
    createSetupWindow()
  } else {
    consola.success('User data found, loading user data')
    userData = (await store.get('userData')) as userData
    consola.info('User data loaded:', userData)
    createMainWindow()
  }

  ipcMain.on('ping', () => read_images())
  ipcMain.on('two', () => mmo())
  ipcMain.on('three', () => three())

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  consola.warn('All windows closed, quitting app')
  app.quit()
})

async function sendPermissionState(event: IpcMainEvent): Promise<void> {
  // darwin, windows only method
  const camera = await systemPreferences.getMediaAccessStatus('camera')
  consola.info('Checking camera permission state:', camera)
  event.sender.send('permission-state', camera)
}

async function askPermission(event: IpcMainEvent): Promise<void> {
  // darwin only method
  if (process.platform == 'darwin') {
    const camera = await systemPreferences.askForMediaAccess('camera')
    if (camera) {
      consola.success('Camera permission granted')
      event.sender.send('permission-state', 'granted')
    } else {
      consola.error('Camera permission denied')
      event.sender.send('permission-state', 'denied')
    }
  } else {
    // todo : ask for permission on other platforms
    consola.error('Camera permission is not supported on this platform')
  }
}

function setupComplete(_event: IpcMainEvent, data: userData): void {
  userData = data
  store.set('userData', userData)
  consola.success('User data saved')
  consola.info('User data from store:', store.get('userData'))
  ipcMain.off('get-permission-state', sendPermissionState)
  ipcMain.off('ask-permission', askPermission)
  ipcMain.off('setup-complete', setupComplete)

  createMainWindow()
}

async function three(): Promise<void> {
  //console log how much time is passed since the app started
  const uptime = os.uptime() - isStarted
  console.log(`App has been running for ${uptime} seconds`)
  //console log how much time is passed since the app started in hours, minutes and seconds
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = Math.floor(uptime % 60)
  console.log(`App has been running for ${hours} hours, ${minutes} minutes and ${seconds} seconds`)
}

async function mmo(): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: 'AIzaSyAzyrPJFxwRD_uvl6rdyjYW0-NjE4MDd-g' })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents:
      "The user is currently studying on his laptop in bed for 135 minutes. He has a history of cervical disc herniation and turtle neck, and his goal is to reduce his neck pain. He is currently feeling tired, and his last posture feedback was ignored 3 out of 5 times, and the last feedback was not accepted. Today, he maintained good posture 38%, and this week's average is 41%. I wanna rest 10 minutes in every period. How long time is enough for him about one period? 10 minutes? or 1 hour?"
  })
  console.log(response.text)
}
function isBentPosture(keypoints: { x: number; y: number; confidence: number }[]): boolean {
  const MIN_CONFIDENCE = -6.0

  // ?��: �?, ?��?���?, ?��른어�?, 골반, ?��무릎, ?��른무�?
  const NECK = keypoints[1]
  const LEFT_SHOULDER = keypoints[3]
  const RIGHT_SHOULDER = keypoints[4]
  const MID_HIP = keypoints[7] // ?��?�� 좌우 골반 ?���?
  const LEFT_KNEE = keypoints[11]
  const RIGHT_KNEE = keypoints[12]

  if ([NECK, LEFT_SHOULDER, RIGHT_SHOULDER, MID_HIP].some((kp) => kp.confidence < MIN_CONFIDENCE)) {
    return false
  }

  // 1. ?���? 좌우 ?��?�� 차이 (y�? 기�??)
  const shoulderTilt = Math.abs(LEFT_SHOULDER.y - RIGHT_SHOULDER.y)

  // 2. 척추 기울�? (x�? 기�??)
  const spineLean = Math.abs(NECK.x - MID_HIP.x)

  // 3. �? ?��?���? ?���? (머리 x�? ?���? 중심보다 많이 ?���?)
  const shoulderMidX = (LEFT_SHOULDER.x + RIGHT_SHOULDER.x) / 2
  const neckForwardLean = Math.abs(NECK.x - shoulderMidX)

  // 조건 기�????? 경험?��?���? 조정 �??��
  return (
    shoulderTilt > 20 || // ?���? ?��?�� 차이 ?��
    spineLean > 30 || // 척추�? ?��쪽으�? 치우�?
    neckForwardLean > 25 // 거북�?/고개 ?��?���? ?��?��
  )
}
async function read_images(): Promise<void> {
  const resizedImageBuffer = await sharp(join(__dirname, '../../resources/1.jpg'))
    .resize(257, 353) // [W x H] ?��?��?��!
    .removeAlpha()
    .raw()
    .toBuffer()

  // 2. Tensor�? �??�� (shape: [1, 353, 257, 3])
  const input = tf.tensor(new Uint8Array(resizedImageBuffer), [1, 353, 257, 3])

  // 1. .tflite 모델 로드
  const model = await tflite.loadTFLiteModel(join(__dirname, '../../resources/model/1.tflite'))

  // 2. ?��?�� ?��?�� ?��?�� (?��: 224x224 RGB ?��미�??)
  console.log('input shape:', input.shape)
  // 3. 추론
  const output = model.predict(input)
  const heatmapTensor = output.float_heatmaps
  const transposed = heatmapTensor.transpose([0, 3, 1, 2])
  const heatmapArray = await transposed.array()

  const [batch, numKeypoints, h, w] = transposed.shape
  const inputHeight = 353
  const inputWidth = 257

  const scaleY = inputHeight / h
  const scaleX = inputWidth / w

  const keypoints: { x: number; y: number; confidence: number }[] = []

  for (let k = 0; k < numKeypoints; k++) {
    let maxVal = -Infinity
    let maxX = 0
    let maxY = 0

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const val = heatmapArray[0][k][y][x]
        if (val > maxVal) {
          maxVal = val
          maxX = x
          maxY = y
        }
      }
    }

    keypoints.push({
      x: maxX * scaleX,
      y: maxY * scaleY,
      confidence: maxVal
    })
  }

  const bent = isBentPosture(keypoints)
  if (bent) {
    console.log('it bents')
  } else {
    console.log('it did not bent')
  }
}
