"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Theme } from "@radix-ui/themes"
import "@radix-ui/themes/styles.css"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        {children}
      </NextThemesProvider>
    </Theme>
  )
}
