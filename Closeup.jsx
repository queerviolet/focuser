import React from 'react'

import {keypoint, label, frame as frameClass,
        content, selected, fillContainer} from './keypoints.css'

import RxComponent, {rxed, optional} from './rxact'
import {BehaviorSubject, merge, concat, fromEvent} from 'rxjs'
import {first, filter, distinctUntilChanged} from 'rxjs/operators'

import {classes, absolute} from './css'

// Pose stream functions
import {loadImage, estimatePose,
        keypointsForContentSize, byPart, positionOfPart} from './pose'
const estimatePose$ = rxed(estimatePose)
const loadImage$ = rxed.plucking('size')(loadImage)
const keypointsForContentSize$ = rxed(keypointsForContentSize)
const byPart$ = rxed(byPart)
const positionOfPart$ = rxed(positionOfPart)

// Box stream functions
import {sizeThatCovers, center, contentOffsetFromAnchorToTarget} from './box'
const sizeThatCovers$ = rxed(sizeThatCovers)
const center$ = rxed(center)
const contentOffsetFromAnchorToTarget$ = rxed(contentOffsetFromAnchorToTarget)

// Watch a bounding client rect as the window resizes and as
// the watched box changes.
const getBoundingRect$ = rxed(_ => _.getBoundingClientRect())
const resized = fromEvent(window, 'resize')
const watchBoundingRect$ = el$ => getBoundingRect$(el$, optional(resized))

export default class Closeup extends RxComponent {
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
    const frameRect$ = watchBoundingRect$(this.frame$)

    // Load the image and estimate the pose.
    const image$ = loadImage$(src$)
    const pose$ = estimatePose$(image$, posenetSize$)

    // Calculate how large the image should be to cover the frame.
    const contentSize$ = sizeThatCovers$(frameRect$, image$.size)

    // Scale posenet's keypoints to the actual content size,
    // and reduce them into an object keyed by the name of the part
    // for ease of use.
    const keypoints$ = keypointsForContentSize$(pose$, contentSize$)
    const namedKeypoints$ = byPart$(keypoints$)

    // Lookup the position of the part we're trying to center.
    const target$ = concat(
      // Start on the center
      center$(frameRect$).pipe(first()),
      
      // Once the pose is calculated, use that.
      positionOfPart$(namedKeypoints$, this.part$)
    )

    // Finally, find the content offset that gets the target point
    // as close to center as possible while still covering the frame.
    const contentOffset$ = contentOffsetFromAnchorToTarget$(contentSize$, frameRect$, target$)

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
      transform: `translate(${x}px, ${y}px)`,
      backgroundImage: `url(${this.props.src})`,
      backgroundSize: 'cover',
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
             style={absolute({top, left, width: '10px', height: '10px'})}>
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
        {this.keypoints}
      </div>
    </div>
  }
}
