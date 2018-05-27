import * as posenet from '@tensorflow-models/posenet'

let net = null
const load = () => net || (net = posenet.load())

export const loadImage = src => new Promise(
  (resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      img.size = {width: img.width, height: img.height}
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  }
)

export const estimatePose = async (image, posenetSize=256) => {
  // Load the model.
  const net = await posenet.load()

  // Posenet needs a square image—a small one, ideally.
  // We use 256x256 by default.
  image.width = image.height = posenetSize
  const pose = await net.estimateSinglePose(image, 1.0)

  // Add a few keypoints attached to the box for demonstration purposes.
  pose.keypoints.push(...boxPoints(posenetSize))
  
  return {
    ...pose,
    posenetSize, // We'll also include the size of the net
                 // used to calculate the pose.
  }
}

const boxPoints = sz => [
  {part: 'northEast', position: {x: 0, y: 0}},
  {part: 'north', position: {x: sz / 2, y: 0}},
  {part: 'northWest', position: {x: sz, y: 0}},
  {part: 'east', position: {x: 0, y: sz / 2}},
  {part: 'center', position: {x: sz / 2, y: sz / 2}},  
  {part: 'west', position: {x: sz, y: sz / 2}},
  {part: 'southEast', position: {x: 0, y: sz}},
  {part: 'south', position: {x: sz / 2, y: sz}},
  {part: 'southWest', position: {x: sz, y: sz}},  
]

export const scaleKeypointPositionBy = scale => kp => ({
  ...kp,
  position: {
    x: scale.x * kp.position.x,
    y: scale.y * kp.position.y,
  }
})

export const keypointsForContentSize =
  ({posenetSize, keypoints}, size) => {
    const scale = {
      x: size.width / posenetSize,
      y: size.height / posenetSize
    }
    return keypoints.map(scaleKeypointPositionBy(scale))
  }

export const byPart = keypoints => keypoints
  .reduce((points, kp) => (points[kp.part] = kp, points), {})

export const positionOfPart =
  (keypoints, part) => keypoints[part].position