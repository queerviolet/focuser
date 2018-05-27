import 'babel-polyfill'

import React from 'react'
import {render} from 'react-dom'

import Closeup from './Closeup'

import drawing from './people/2.jpg'

import {centered} from './css'

const people = require.context('./people')

const flexRowWrap = {
  display: 'flex',
  flexFlow: 'row wrap',
}

const oneThird = {
  position: 'relative',
  width: 'calc(100vw / 3)',
  height: 'calc(100vh / 3)',
  overflow: 'hidden',
}

const fill = {
  width: '100%', height: '100%'
}

const viewport = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100vw', height: '100vh',
}

// render(
//   <div style={flexRowWrap}>{
//     people.keys().map(k =>
//       <div key={k} style={oneThird}>
//         <Closeup style={fill} src={people(k)} />
//       </div>
//     )
//   }</div>, main)

render(
  <Closeup style={viewport} src={people('./4.jpg')} />,
  main)