export const classes = (...classes) => classes.filter(_ => _).join(' ')

export const absolute = ({top=0, left=0, width, height}={}) => ({
  display: 'block',
  position: 'absolute',
  top: top && `${top}px`,
  left: left && `${left}px`,
  width: width ? `${width}px` : '100%',
  height: height ? `${height}px` : '100%',
})

export const asLength = value => typeof value === 'string'
  ? value
  : `${value}px`

export const transform = ({x=0, y=0}={}, scale=1) => ({
  transform: `scale(${scale}) translate(${asLength(x)}, ${asLength(y)})`,
  transformOrigin: '0 0'
})

export const centered = (width='100%', height='100%') => ({
  position: 'absolute',
  top: '50%', left: '50%',
  width: asLength(width),
  height: asLength(height),
  transform: 'translate(-50%, -50%)',
  overflow: 'hidden',
})