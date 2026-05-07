import * as React from 'react'
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
      title: 'Forma — 3D Furniture Physics Studio',
      description: 'Build, validate, and ship furniture designs with real-time physics simulation',
}

export const viewport: Viewport = {
      width: 'device-width',
      initialScale: 1,
}

export default function RootLayout(props: { children: React.ReactNode }) {
      return React.createElement(
              'html',
          { lang: 'en', className: 'dark' },
              React.createElement('body', null, props.children)
            )
}
