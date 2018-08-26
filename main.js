require('dotenv').config()

const { API_KEY } = process.env
if (!API_KEY) {
  console.error('No API_KEY set in the .env file')
  process.exit(1)
}

const fs = require('fs')

const express = require('express')
const app = express()
const multer = require('multer')

const cv = require('opencv4nodejs')
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2)

const UPLOAD_FOLDER = './uploads/'
const upload = multer({
  dest: UPLOAD_FOLDER,
  limits: {
    fileSize: 1000000
  }
})

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', 'https://photo-printer-server.glitch.me');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  response.setHeader('Access-Control-Allow-Credentials', true);

  next()
})

app.use((request, response, next) => {
  const apiKey = request.get('x-api-key')
  if (!apiKey || apiKey !== API_KEY) {
    return response.status(500).json({
      error: 'Incorrect API key sent'
    })
  }

  next()
})

app.post('/upload', upload.single('image'), (request, response) => {
  if (!request.file) {
    return response.status(500).json({ error: 'No file sent' })
  }
  const filePath = UPLOAD_FOLDER + request.file.filename
  const image = cv.imread(filePath)

  const {
    objects,
    numDetections
  } = classifier.detectMultiScale(image.bgrToGray())

  // delete file
  fs.unlinkSync(filePath)
  
  if (!objects.length) {
    throw response.status(500).json({ error: 'No faces detected' })
  }

  const objectsWithConfidences = objects.map((object, i) => {
    return Object.assign({ confidence: numDetections[i] }, object)
  })

  return response.json(objectsWithConfidences)
})

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})