export const sizeThatCovers = (
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
}

export const scaleThatCovers = (
  frame,
  image,
) =>
  aspect(image) > aspect(frame)
    ? frame.height / image.height
    : frame.width / image.width

export const aspect = ({width, height}) => width / height

export const zclamp = x => Math.min(x, 0)

export const contentOffsetFromAnchorToTarget = (size, frame, {x, y}) => {
  const target = {x: frame.width / 2, y: frame.height / 2}
  return {
    x: Math.max(zclamp(target.x - x), -size.spillover.x),
    y: Math.max(zclamp(target.y - y), -size.spillover.y)
  }
}

export const center = ({width, height}) => ({
  width: width / 2,
  height: height / 2,
})
