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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
          <html lang="en" className="dark">
                <body>{children}</body>body>
          </html>html>
        )
}</html>
