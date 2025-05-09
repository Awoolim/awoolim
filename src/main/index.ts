import { app, shell, BrowserWindow, ipcMain, IpcMainEvent, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { GoogleGenAI,Type } from '@google/genai'
import * as tf from '@tensorflow/tfjs'
import * as tflite from 'tfjs-tflite-node'
import Store from 'electron-store'
import consola from 'consola'
import sharp from 'sharp'
import os from 'os'
import icon from '../../resources/icon.png?asset'
import { error, time } from 'console'

let store = new Store()

let isStarted = 0

let userData: userData = {
  language: 'en',
  name: '',
  age: 0,
  gender: 'unspecified',
  conditions: [],
  otherConditionDetail: ''
}

async function createMainWindow(): Promise<void> {
  // Create the browser window.
  let mainWindow = new BrowserWindow({
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
  check_setup()
  
  let time_do = await get_data_and_communicate_with_gemini()
  console.log("time_analyze : ", time_do);
  
}

function createSetupWindow(): void {
  let setupWindow = new BrowserWindow({
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

app.whenReady().then(async () => {
  consola.box('Awoolim is starting up...')
  consola.info('App version:', app.getVersion())
  consola.info('Node version:', process.versions.node)
  consola.info('Chromium version:', process.versions.chrome)
  consola.info('Electron version:', process.versions.electron)
  consola.info('OS version:', process.platform, process.getSystemVersion())
  consola.info('OS architecture:', process.arch)

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  isStarted = os.uptime()

  // if (store.get('userData') == undefined) {
  //   consola.warn('User data not found, creating setup window')
    ipcMain.on('get-permission-state', sendPermissionState)
    ipcMain.on('ask-permission', askPermission)
    ipcMain.on('setup-complete', setupComplete)
    createSetupWindow()
  // } else {
  //   consola.success('User data found, loading user data')
  //   userData = (await store.get('userData')) as userData
  //   consola.debug('User data loaded:', userData)
    // createMainWindow()
  // }

  // tflite 모델 로드 여부 
  // ipcMain.on('three', () => three())

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
  consola.info('Checking camera permission state')
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

  const setupWindow = BrowserWindow.getAllWindows().find((window) => window.getTitle() === 'Setup')
  if (setupWindow) {
    setupWindow.close()
  }

  createMainWindow()
}
async function check_tflite(): Promise<boolean> {
  try {
    // 1. .tflite 모델 로드
    let model = await tflite.loadTFLiteModel(join(__dirname, '../../resources/model/1.tflite'))
    // 2. ?��?�� ?��?�� ?��?�� (?��: 224x224 RGB ?��미�??)
    let input = tf.zeros([1, 353, 257, 3])
    // 3. 추론
    model.predict(input)
    return true
  }
  catch (error) {
    console.error('Error loading tflite model:', error)
    return false
  }
}

async function check_setup(): Promise<void> {
  if (await check_tflite()) {
    console.log("tflite model loaded");
  } else {
    console.log("Failed to load tflite model");
    error("Failed to load tflite model");
  }
}

async function get_data_and_communicate_with_gemini(): Promise<number> {
  let send_script = "\
  this person is "+userData.age+" years old, gender is "+userData.gender+"\
  this person has these diseases : "+userData.conditions.join(', ')+"\
  this person is developer, and this person work. \
  Tell me how much time we have to work per resting 10 minutes"
  let send_gemini = await get_send_gemini(send_script)
  if (send_gemini == undefined) {
    consola.error("Gemini response is undefined")
    return "Gemini response is undefined"
  }
  let result =  JSON.parse(send_gemini)
  
  return parseInt(result["result"])
}

async function get_send_gemini(gemini_thing : string): Promise<String> {
  let ai = new GoogleGenAI({ apiKey: 'AIzaSyAzyrPJFxwRD_uvl6rdyjYW0-NjE4MDd-g' })
  const config = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        result: {
          type: Type.NUMBER,
        },
      },
    },
  };
  let response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    config: config,
    contents:
      gemini_thing
  })
  return response.text || ''
}

async function read_images(): Promise<void> {
  let imagePath = join(__dirname, '../../resources/5.jpg')
  let targetWidth = 257
  let targetHeight = 353
  let metadata = await sharp(imagePath).metadata()

  let centerX = Math.floor((metadata.width! - targetWidth) / 2)
  let centerY = Math.floor((metadata.height! - targetHeight) / 2)
  let resizedImageBuffer = await sharp(imagePath)
    .extract({ left: centerX, top: centerY, width: targetWidth, height: targetHeight })
    .removeAlpha()
    .raw()
    .toBuffer()

  // 2. Tensor�? �??�� (shape: [1, 353, 257, 3])
  let input = tf.tensor(new Uint8Array(resizedImageBuffer), [1, 353, 257, 3])

  // 1. .tflite 모델 로드
  let model = await tflite.loadTFLiteModel(join(__dirname, '../../resources/model/1.tflite'))

  // 2. ?��?�� ?��?�� ?��?�� (?��: 224x224 RGB ?��미�??)
  console.log('input shape:', input.shape)
  // 3. 추론
  let output = model.predict(input)
  let heatmapTensor = output.float_heatmaps
  let transposed = heatmapTensor.transpose([0, 3, 1, 2])
  let heatmapArray = await transposed.array()

  let [batch, numKeypoints, h, w] = transposed.shape
  let inputHeight = 353
  let inputWidth = 257

  let scaleY = inputHeight / h
  let scaleX = inputWidth / w

  let keypoints: { x: number; y: number; confidence: number }[] = []

  for (let k = 0; k < numKeypoints; k++) {
    let maxVal = -Infinity
    let maxX = 0
    let maxY = 0

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = heatmapArray[0][k][y][x]
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

  let nose = keypoints[0]
  let leftShoulder = keypoints[5]
  let rightShoulder = keypoints[6]
  let leftHip = keypoints[11]
  let rightHip = keypoints[12]

  let 목기울어짐 = Math.abs(leftShoulder.x - nose.x - (rightShoulder.x - nose.x)) > 30
  let 어깨비대칭 = Math.abs(leftShoulder.y - rightShoulder.y) > 20
  let 어깨굽음 = leftShoulder.y - nose.y > 30 && rightShoulder.y - nose.y > 30
  let 상체기울어짐 = Math.abs(leftHip.x - rightHip.x) > 40

  let result = {
    '0': 목기울어짐,
    '1': 어깨비대칭,
    '2': 어깨굽음,
    '3': 상체기울어짐
  }

  console.log(JSON.stringify(result))
}
