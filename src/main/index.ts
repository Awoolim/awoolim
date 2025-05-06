import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as tf from '@tensorflow/tfjs'
import * as tflite from 'tfjs-tflite-node'
import Store from 'electron-store'

const store = new Store()
import { GoogleGenAI } from '@google/genai'
import os from 'os'

let isStarted = 0

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
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  isStarted = os.uptime()

  if (store.get('initialized') == undefined) {
    createMainWindow()
    createSetupWindow()
  } else {
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
  app.quit()
})

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

async function read_images(): Promise<void> {
  // 1. .tflite 모델 로드
  const model = await tflite.loadTFLiteModel(join(__dirname, '../../models/model.tflite'))

  // 2. ?��?�� ?��?�� ?��?�� (?��: 224x224 RGB ?��미�??)
  const input = tf.tensor(new Uint8Array(160 * 160 * 3), [1, 160, 160, 3])

  // 3. 추론
  const output = model.predict(input)

  // 4. 결과 출력
  if (output instanceof tf.Tensor) {
    output.print()
  } else {
    console.log('Output is not a single tensor:', output)
  }
}
