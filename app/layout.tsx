import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppProvider } from './context/AppContext' // (혹시 경로 다르면 ../context/AppContext)

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SECONDLIFE ERP',
  description: '모빌리티 비즈니스 통합 솔루션',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 사이드바는 여기서 빼고, AppProvider로 감싸기만 합니다 */}
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}