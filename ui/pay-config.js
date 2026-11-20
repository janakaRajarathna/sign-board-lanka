tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['Space Grotesk', 'monospace'],
            heading: ['Space Grotesk', 'sans-serif'],
          },
          colors: {
            brand: {
              DEFAULT: '#1d4ed8',
              hover: '#2563eb',
              light: '#3b82f6',
              dark: '#1e40af'
            },
            surface: {
              base: '#0b1326',
              sidebar: '#131b2e',
              card: '#131b2e',
              hover: '#1b253d',
              border: '#1e293b'
            }
          }
        }
      }
    }
