'use client'

import { useEffect } from 'react'

export default function DemoBodyStyle() {
  useEffect(() => {
    // Add class to body for demo page styling
    document.body.classList.add('demo-page')
    
    return () => {
      // Cleanup: remove class when component unmounts
      document.body.classList.remove('demo-page')
    }
  }, [])

  return null
}

