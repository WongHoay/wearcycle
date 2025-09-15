import './globals.css'

export const metadata = {
  title: 'WearCycle',
  description: 'Buy and sell second-hand clothing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
