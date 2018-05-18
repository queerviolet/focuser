import 'babel-polyfill'

import React from 'react'
import {render} from 'react-dom'

import * as posenet from '@tensorflow-models/posenet'

import {keypoint, label, frame as frameClass, content, fillContainer} from './keypoints.css'
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

const loadImage = src => new Promise(
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

const classes = (...classes) => classes.join(' ')

const aspect = ({width, height}) => width / height

const scaleThatCovers = (
  frame,
  image,
) =>
  aspect(image) > aspect(frame)
    ? frame.height / image.height
    : frame.width / image.width

const sizeThatCovers = (
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
      : {
        width: frame.width,
        height: frame.width / imageAspect,
        scaledBy: frame.width / image.width,
      }
  size.spillover = {
    x: size.width - frame.width,
    y: size.height - frame.height,
  }
  return size
}

const estimatePose = async (image, posenetSize=256) => {
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
}

import RxComponent, {latestState} from './rxact'
import {BehaviorSubject, Observable, of, from, fromEvent, pipe, combineLatest as latest} from 'rxjs'
import {map, mergeMap, pluck} from 'rxjs/operators'

const rxwait = f => (...args) => from(f(...args))
const rxwaitv = f => args => from(f(...args))

const zclamp = x => Math.min(x, 0)

const scaleKeypointPositionsBy = scale => kp => ({
  ...kp,
  position: {
    x: scale.x * kp.position.x,
    y: scale.y * kp.position.y,
  }
})

class Closeup extends RxComponent {
  state = {keypoints: null}

  static defaultProps = {
    posenetSize: 256
  }

  frame$ = new BehaviorSubject
  frameDidMount = frame => frame && this.frame$.next(frame)

  go() {
    const posenetSize$ = this.prop$('posenetSize')
    const src$ = this.prop$('src')

    const image$ = src$.pipe(mergeMap(rxwait(loadImage)))

    const pose$ = latest(image$, posenetSize$).pipe(
      mergeMap(rxwaitv(estimatePose))
    )

    const frameRect$ = latest(this.frame$, fromEvent(window, 'resize')).pipe(
      map(([frame]) => frame.getBoundingClientRect())
    )

    const contentSize$ = latest(frameRect$, image$).pipe(
      map(([frame, image]) =>
        sizeThatCovers(frame, image.size)
      )
    )

    const keypoints$ = latest(contentSize$, pose$).pipe(
      map(
        ([contentSize, {posenetSize, keypoints}]) => {
          const scale = {
            x: contentSize.width / posenetSize,
            y: contentSize.height / posenetSize
          }
          return keypoints.map(scaleKeypointPositionsBy(scale))
        }
      )
    )

    const namedKeypoints$ = keypoints$.pipe(
      map(
        keypoints => keypoints
          .reduce((points, kp) => (points[kp.part] = kp, points), {})
      )
    )

    const nose$ = namedKeypoints$.pipe(pluck('nose'))

    const contentOffset$ = latest(contentSize$, frameRect$, nose$).pipe(
      map(([size, frame, {position}]) => {
        const center = {x: frame.width / 2, y: frame.height / 2}
        console.log(center)
        return {
          x: Math.max(zclamp(center.x - position.x), -size.spillover.x),
          y: Math.max(zclamp(center.y - position.y), -size.spillover.y)
        }
      })
    )

    return latestState({
      contentSize: contentSize$,
      keypoints: keypoints$,
      contentOffset: contentOffset$,
    })
  }

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
    const {keypoints} = this.state
    if (!keypoints) return null
    return keypoints.map(
      ({part, position: {x: left, y: top}}) =>
        <div key={part} className={keypoint} style={absolute({top, left})}>
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

render(<Closeup style={{
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
}} src={drawing} />, main)