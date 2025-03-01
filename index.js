import { createCanvas } from 'canvas'
import { spawn } from 'child_process'
import Url from 'url'
//import { Readable } from 'stream'
import { track } from './track.js'

let width, height, fontPx
let clrDot, clrText, d, heightDot, pad, widthDot

d = console.log

// Set the video dimensions and duration
if (1) {
  // production
  fontPx = 24
  width = 1280
  height = 720
}
else {
  // dev
  fontPx = 6
  width = 320
  height = 180
}
d(width + 'x' + height)
d(fontPx + 'px')
const duration = track.length // seconds
const fps = 30
// Set the audio file path
const audioFilePath = Url.fileURLToPath(new URL('./penguin.mp3', import.meta.url))

// Create a new canvas element
const canvas = createCanvas(width, height)
const ctx = canvas.getContext('2d')

clrDot = '#000000'
clrText = '#000000'

pad = fontPx / 2
widthDot = fontPx
heightDot = widthDot
//ctx.imageSmoothingQuality = 'high'

// Set the font and text
ctx.font = fontPx + 'px Arial'
ctx.textAlign = 'left'
ctx.textBaseline = 'middle'

// Generate the video frames
const frames = []
for (let i = 0; i < duration * fps; i++) {
  let now, beat

  now = i / fps
  if (i % fps == 0)
    if (now % 10 == 0)
      d(' ' + now + 's')
    else
      process.stdout.write(' ' + now + 's')

  //ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  beat = 0
  for (let is = 0; is < track.sections.length; is++) {
    let section

    section = track.sections[is]
    for (let ip = 0; ip < section.phrases.length; ip++) {
      let phrase

      phrase = section.phrases[ip]
      for (let ibar = 0; ibar < phrase.bars; ibar++)
        for (let ib = 0; ib < track.bpb; ib++) {
          let time

          time = track.beats[beat]
          if ((ib == 0) && (time <= now)) {
            let p, x, y

            y = (pad * 2) + (is * pad) + (is * heightDot)

            if (section.name) {
              ctx.fillStyle = clrText
              ctx.fillText(section.name, width / 2, y + (fontPx / 2))
            }

            ctx.fillStyle = phrase.bg || section.bg || clrDot

            p = (width / 4) + pad + (Math.floor(ibar / 2) * pad)
            x = p + (ibar * (widthDot / 2))
            if (ibar % 2 == 0)
              // first bar in 8
              ctx.fillRect(x,
                           y,
                           (widthDot / 2), // width
                           heightDot) // height
            else
              // second bar in 8
              ctx.fillRect(x,
                           y,
                           (widthDot / 2), // width
                           heightDot) // height
          }
          beat++
        }
    }
  }
  const frame = canvas.toBuffer('image/png')
  //const frame = canvas.toBuffer('raw')
  frames.push(frame)
}

/*
// Use ffmpeg to generate the video
const ffmpeg = spawn('ffmpeg',
                     [ '-framerate',
                       fps.toString(),
                       '-i',
                       'pipe:0',
                       '-c:v',
                       'libx264',
                       '-crf',
                       '18',
                       'output.mp4' ])
*/

/*
// Use ffmpeg to generate the video with the MP3 file playing in the background
const ffmpeg = spawn('ffmpeg',
                     [ '-f',
                       'lavfi',
                       '-i',
                       `amovie=${audioFilePath},loop=999`,
                       '-f',
                       'image2pipe',
                       '-framerate',
                       fps.toString(),
                       '-i',
                       'pipe:0',
                       '-filter_complex',
                       '[1:v][0:a]concat=n=1:v=1:a=1',
                       '-c:v',
                       'libx264',
                       '-crf',
                       '18',
                       '-c:a',
                       'aac',
                       '-b:a',
                       '128k',
                       'output.mp4' ])
*/

// Use ffmpeg to generate the video with the MP3 file playing in the background
const ffmpeg = spawn('ffmpeg',
                     [ '-thread_queue_size', '1024', // else epipe when big output
                       '-y',
                       '-nostdin',
                       '-f',
                       'image2pipe',
                       //'rawvideo',
                       '-framerate',
                       fps.toString(),
                       '-i',
                       'pipe:0',
                       '-i',
                       audioFilePath,
                       '-c:v',
                       'libx264',
                       '-crf',
                       '18',
                       '-c:a',
                       'aac',
                       '-b:a',
                       '128k',
                       '-shortest',
                       '-s',
                       `${width}x${height}`,
                       'output.mp4' ])

/*
const readableStream = new Readable({
  read() {
    if (frames.length > 0) {
      const frame = frames.shift()
      this.push(frame)
    }
    else
      this.push(null)
  }
})

readableStream.pipe(ffmpeg.stdin)
 */

ffmpeg.stdin.on('error', err => {
  console.log(`stdin error: ${err}`)
})

ffmpeg.stdout.on('data', data => {
  console.log(`stdout: ${data}`)
})

ffmpeg.stderr.on('data', data => {
  console.log(`stderr: ${data}`)
})

ffmpeg.on('close', code => {
  console.log(`ffmpeg exited with code ${code}`)
  console.log('output.mp4 has been generated')
  process.exit(code)
})

ffmpeg.on('exit', code => {
  console.log(`child process exited with code ${code}`)
})

ffmpeg.on('error', err => {
  console.error(`ffmpeg error: ${err}`)
  process.exit(1)
})

frames.forEach(frame => ffmpeg.stdin.write(frame))
ffmpeg.stdin.end()

/*
readableStream.on('finish', () => {
  console.log('Finished writing to ffmpeg')
  ffmpeg.stdin.destroy()
//  ffmpeg.stdin.on('drain', () => {
//    ffmpeg.stdin.end()
//  })
})
*/
