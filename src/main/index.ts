import { app, shell, BrowserWindow, ipcMain, IpcMainEvent } from 'electron'
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

let store = new Store()

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

  // if (store.get('userData') == undefined) {
  //   consola.warn('User data not found, creating setup window')
  //   ipcMain.on('setup-complete', setupComplete)
  //   createSetupWindow()
  // } else {
  //   consola.success('User data found, loading user data')
  //   userData = (await store.get('userData')) as userData
  //   consola.debug('User data loaded:', userData)
  //   createMainWindow()
  // }

  createMainWindow()

  read_images()
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
  consola.info('All windows closed, quitting app')
  app.quit()
})

function setupComplete(_event: IpcMainEvent, data: userData): void {
  userData = data
  store.set('userData', userData)
  consola.success('User data saved')
  consola.debug('User data from store:', store.get('userData'))
  ipcMain.off('setup-complete', setupComplete)

  createMainWindow()
}

async function three(): Promise<void> {
  //console log how much time is passed since the app started
  let uptime = os.uptime() - isStarted
  console.log(`App has been running for ${uptime} seconds`)
  //console log how much time is passed since the app started in hours, minutes and seconds
  let hours = Math.floor(uptime / 3600)
  let minutes = Math.floor((uptime % 3600) / 60)
  let seconds = Math.floor(uptime % 60)
  console.log(`App has been running for ${hours} hours, ${minutes} minutes and ${seconds} seconds`)
}

async function mmo(): Promise<void> {
  let ai = new GoogleGenAI({ apiKey: 'AIzaSyAzyrPJFxwRD_uvl6rdyjYW0-NjE4MDd-g' })

  let response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents:
      "The user is currently studying on his laptop in bed for 135 minutes. He has a history of cervical disc herniation and turtle neck, and his goal is to reduce his neck pain. He is currently feeling tired, and his last posture feedback was ignored 3 out of 5 times, and the last feedback was not accepted. Today, he maintained good posture 38%, and this week's average is 41%. I wanna rest 10 minutes in every period. How long time is enough for him about one period? 10 minutes? or 1 hour?"
  })
  console.log(response.text)
}


async function read_images(): Promise<void> {
  let imagePath = join(__dirname, '../../resources/5.jpg')
  let targetWidth = 257
  let targetHeight = 353
  let metadata = await sharp(imagePath).metadata();

  let centerX = Math.floor((metadata.width! - targetWidth) / 2);
  let centerY = Math.floor((metadata.height! - targetHeight) / 2);
  let resizedImageBuffer = await sharp(imagePath)
  .extract({ left: centerX, top: centerY, width: targetWidth, height: targetHeight })
  .removeAlpha()
  .raw()
  .toBuffer();

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
  
  let nose = keypoints[0];
  let leftShoulder = keypoints[5];
  let rightShoulder = keypoints[6];
  let leftHip = keypoints[11];
  let rightHip = keypoints[12];
  
  let 목기울어짐 = Math.abs((leftShoulder.x - nose.x) - (rightShoulder.x - nose.x)) > 30;
  let 어깨비대칭 = Math.abs(leftShoulder.y - rightShoulder.y) > 20;
  let 어깨굽음 = (leftShoulder.y - nose.y) > 30 && (rightShoulder.y - nose.y) > 30;
  let 상체기울어짐 = Math.abs(leftHip.x - rightHip.x) > 40;
  
  let result = {
    "0": 목기울어짐,
    "1": 어깨비대칭,
    "2": 어깨굽음,
    "3": 상체기울어짐
  };
  
  console.log(JSON.stringify(result));
}

