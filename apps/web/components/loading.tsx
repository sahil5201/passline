"use client"

import NextTopLoader from "nextjs-toploader"

export function Loader() {
  return (
    <NextTopLoader
      color="hsl(var(--primary))"
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow="0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))"
    />
  )
}
