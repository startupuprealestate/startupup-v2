import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="th">
      <Head>
        {/* โหลด Tailwind ผ่าน CDN แบบด่วน */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: { brand: { green: '#0b3d1b', light: '#eef3f0' } },
                  fontFamily: { sans: ['Prompt', 'sans-serif'] },
                  boxShadow: { 'soft': '0 20px 50px -12px rgba(11, 61, 27, 0.15)' }
                }
              }
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}