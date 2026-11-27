import { Heart, TreePine } from 'lucide-react'
import type { ReactNode } from 'react'

export function FestiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="festive-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a href="/" className="brand-link" aria-label={`${import.meta.env.VITE_APP_NAME.trim()} – domov`}>
            <span className="brand-mark"><TreePine size={20} strokeWidth={1.8} aria-hidden="true" /></span>
            <span>{import.meta.env.VITE_APP_NAME.trim()}<small lang="en">A LITTLE DECEMBER MAGIC</small></span>
          </a>
          <span className="header-decoration" aria-hidden="true">✦</span>
        </div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="site-footer"><span lang="en">Made for moments worth keeping</span> <Heart size={13} fill="currentColor" aria-hidden="true" /></footer>
    </div>
  )
}

export function WinterScene() {
  return (
    <svg viewBox="0 0 460 400" fill="none" className="winter-scene" aria-hidden="true">
      <circle cx="230" cy="196" r="160" fill="#F4E7DB" />
      <circle cx="230" cy="196" r="133" fill="#F8F0E7" />
      <path d="M75 307c52-29 105-31 157-14 54 18 105 13 153-9" stroke="#DAC6B0" strokeWidth="2" strokeLinecap="round" />
      <path d="M92 326c71-20 142-18 205 0" stroke="#E4D6C8" strokeWidth="2" strokeLinecap="round" />
      <path d="M211 294h38l-5-42h-28l-5 42Z" fill="#937252" />
      <path d="m230 77-51 88h24l-42 62h25l-38 49h164l-38-49h25l-42-62h24L230 77Z" fill="#345A4B" />
      <path d="m230 96-38 67h20l-32 48h21l-31 47h120l-31-47h21l-32-48h20l-38-67Z" fill="#3E6A58" />
      <path d="m230 51 3.5 9.5 10 1-7.7 6.5 2.4 9.8-8.2-5.3-8.2 5.3 2.4-9.8-7.7-6.5 10-1L230 51Z" fill="#C69A54" />
      <path d="M206 157c14 8 34 8 48 0M190 204c25 12 55 12 80 0M178 248c32 15 72 15 104 0" stroke="#DFBF86" strokeWidth="2" strokeLinecap="round" />
      <circle cx="210" cy="181" r="4" fill="#D7998E" /><circle cx="248" cy="185" r="4" fill="#F2D5A2" />
      <circle cx="193" cy="230" r="4" fill="#F2D5A2" /><circle cx="236" cy="226" r="4" fill="#D7998E" /><circle cx="267" cy="235" r="4" fill="#F2D5A2" />
      <rect x="113" y="266" width="54" height="46" rx="4" fill="#BC6B5E" />
      <path d="M137 266v46M113 281h54" stroke="#F3D9B6" strokeWidth="5" />
      <path d="M140 266c-18 0-22-17-10-17 8 0 10 10 10 17Zm0 0c18 0 22-17 10-17-8 0-10 10-10 17Z" stroke="#F3D9B6" strokeWidth="3" />
      <rect x="291" y="281" width="48" height="35" rx="4" fill="#D9B991" />
      <path d="M314 281v35M291 292h48" stroke="#FAF2E7" strokeWidth="4" />
      <path d="M106 130v20m-10-10h20M341 123v16m-8-8h16M326 210v12m-6-6h12M133 210v12m-6-6h12" stroke="#C49A65" strokeWidth="2" strokeLinecap="round" />
      <circle cx="126" cy="179" r="2" fill="#C49A65" /><circle cx="335" cy="175" r="2" fill="#C49A65" />
      <circle cx="162" cy="110" r="2" fill="#C49A65" /><circle cx="305" cy="96" r="2" fill="#C49A65" />
    </svg>
  )
}
