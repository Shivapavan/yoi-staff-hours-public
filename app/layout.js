export const metadata = { title: 'Yum of India · Staff Hours' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f9fafb', color: '#1f2937' }}>
        {children}
      </body>
    </html>
  )
}
