import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './app'

// eslint-disable-next-line
(window as any).TARGET_MATCHA_VERSION = "5.2.1.1";

ReactDOM.render(<App />, document.getElementById('root'))
