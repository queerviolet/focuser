import 'babel-polyfill'

import React from 'react'
import {render} from 'react-dom'

import * as posenet from '@tensorflow-models/posenet'

import {keypoint, label, frame as frameClass, content, selected, fillContainer} from './keypoints.css'
import drawing from './looking-out.png'
import { METHODS } from 'http';

const posenetDidLoad = posenet.load()

const absolute = ({top=0, left=0, width, height}={}) => ({
  display: 'block',
  position: 'absolute',
  top: top && `${top}px`,
  left: left && `${left}px`,
  width: width && `${width}px`,
  height: height && `${height}px`,
})

const asLength = value => typeof value === 'string'
  ? value
  : `${value}px`

const transform = ({x=0, y=0}={}, scale=1) => ({
  transform: `scale(${scale}) translate(${asLength(x)}, ${asLength(y)})`,
  transformOrigin: '0 0'
})

import {rxed, optional} from './rxact'

const loadImage = rxed.plucking('size')(src => new Promise(
  (resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      img.size = {width: img.width, height: img.height}
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  }
))

const classes = (...classes) => classes.filter(_ => _).join(' ')

const aspect = ({width, height}) => width / height

const scaleThatCovers = (
  frame,
  image,
) =>
  aspect(image) > aspect(frame)
    ? frame.height / image.height
    : frame.width / image.width

const sizeThatCovers = rxed((
  frame,
  image,
  frameAspect=aspect(frame),
  imageAspect=aspect(image)) => {
  const size =  
    imageAspect > frameAspect
      ? {
        width: frame.height * imageAspect,
        height: frame.height,
        scaledBy: frame.height / image.height,
      }
      :
      {
        width: frame.width,
        height: frame.width / imageAspect,
        scaledBy: frame.width / image.width,
      }
  size.spillover = {
    x: size.width - frame.width,
    y: size.height - frame.height,
  }
  return size
})

const estimatePose = rxed(async (image, posenetSize=256) => {
  const net = await posenetDidLoad
  image.width = image.height = posenetSize
  const pose = await net.estimateSinglePose(image, 1.0, false)  
  const scale = {
    x: image.width / posenetSize,
    y: image.height / posenetSize,
  }
  return {
    ...pose,
    posenetSize,    
  }
})    

import RxComponent from './rxact'
import {Subject, BehaviorSubject, merge, of, from, fromEvent, pipe, combineLatest as latest} from 'rxjs'
import {map, mergeMap, pluck, filter, distinctUntilChanged} from 'rxjs/operators'

global.merge = merge
global.of = of
global.Cell = BehaviorSubject

const rxwait = f => (...args) => from(f(...args))
const rxwaitv = f => args => from(f(...args))

const zclamp = x => Math.min(x, 0)

const getBoundingRect = rxed(_ => _.getBoundingClientRect())
const resized = fromEvent(window, 'resize')
const watchBoundingRect = el$ => getBoundingRect(el$, optional(resized))

const scaleKeypointPositionsBy = scale => kp => ({
  ...kp,
  position: {
    x: scale.x * kp.position.x,
    y: scale.y * kp.position.y,
  }
})

const keypointsForContentSize = rxed(({posenetSize, keypoints}, size) => {
  const scale = {
    x: size.width / posenetSize,
    y: size.height / posenetSize
  }
  return keypoints.map(scaleKeypointPositionsBy(scale))
})

const byPart = rxed(keypoints => keypoints
  .reduce((points, kp) => (points[kp.part] = kp, points), {}))

const positionOfPart = rxed(
  (keypoints, part) => keypoints[part].position
)

const contentOffsetFromAnchorToTarget = rxed((size, frame, {x, y}) => {
  const target = {x: frame.width / 2, y: frame.height / 2}
  return {
    x: Math.max(zclamp(target.x - x), -size.spillover.x),
    y: Math.max(zclamp(target.y - y), -size.spillover.y)
  }
})

class Closeup extends RxComponent {
  state = {}

  static defaultProps = {
    part: 'nose',
    showKeypoints: true,
    posenetSize: 256,
  }

  states() {
    // Get the input image src, and the size we'll be using for
    // posenet. Posenet wants square input images, probably smaller
    // than the image's true size (our default is 256x256).
    const posenetSize$ = this.prop$('posenetSize')
    const src$ = this.prop$('src')

    // Also observe the size of our frame.
    const frameRect$ = watchBoundingRect(this.frame$)

    // Load the image and estimate the pose.
    const image$ = loadImage(src$)
    const pose$ = estimatePose(image$, posenetSize$)

    // Calculate how large the image should be to cover the frame.
    const contentSize$ = sizeThatCovers(frameRect$, image$.size)

    // Scale posenet's keypoints to the actual content size,
    // and reduce them into an object keyed by the name of the part
    // for ease of use.
    const keypoints$ = keypointsForContentSize(pose$, contentSize$)
    const namedKeypoints$ = byPart(keypoints$)

    // Lookup the position of the part we're trying to center.
    const target$ = positionOfPart(namedKeypoints$, this.part$)

    // Finally, find the content offset that gets the target point
    // as close to center as possible while still covering the frame.
    const contentOffset$ = contentOffsetFromAnchorToTarget(contentSize$, frameRect$, target$)

    // Return the stream of states we'll use for rendering.
    return {
      contentSize: contentSize$,
      keypoints: keypoints$,
      contentOffset: contentOffset$,
      part: this.part$
    }
  }

  frame$ = new BehaviorSubject
  frameDidMount = frame => frame && this.frame$.next(frame)

  clickedPart$ = new BehaviorSubject
  keypointWasClicked = evt =>
    this.clickedPart$.next(evt.target.dataset.part)

  part$ = merge(this.prop$('part'), this.clickedPart$)
            .pipe(
              filter(x => x),
              distinctUntilChanged()
            )

  get contentStyle() {
    const {contentSize, contentOffset: {x, y}={x: 0, y: 0}} = this.state
    return {
      ...absolute(contentSize),
      transform: `translate(${x}px, ${y}px)`
    }
  }

  get keypoints() {
    const {showKeypoints} = this.props
    if (!showKeypoints) return null
    const {keypoints, part: currentPart} = this.state
    if (!keypoints) return null
    return keypoints.map(
      ({part, position: {x: left, y: top}}) =>
        <div key={part}
             data-part={part}
             onClick={this.keypointWasClicked}
             className={classes(keypoint, part === currentPart && selected)}
             style={absolute({top, left})}>
          <span className={label}>{part}</span>
        </div>
    )
  }

  render() {
    const {src, className, style} = this.props
    return <div
      ref={this.frameDidMount}
      className={classes(frameClass, className)}
      style={style}>
      <div style={this.contentStyle}>
        <img src={src} className={fillContainer} />
        {this.keypoints}
      </div>
    </div>
  }
}

const centered = (width='100%', height='100%') => ({
  position: 'absolute',
  top: '50%', left: '50%',
  width: asLength(width),
  height: asLength(height),
  transform: 'translate(-50%, -50%)',
  overflow: 'hidden',
})

render(<Closeup style={centered()} src={drawing} />, main)