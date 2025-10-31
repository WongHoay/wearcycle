// import './globals.css'

// export const metadata = {
//   title: 'WearCycle',
//   description: 'Buy and sell second-hand clothing',
// }

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   )
// }

import { Inter } from 'next/font/google'
import './globals.css'
//import NotificationHandler from '../components/NotificationHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WearCycle',
  description: 'Sustainable Fashion Marketplace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* <NotificationHandler /> */}
      </body>
    </html>
  )
}