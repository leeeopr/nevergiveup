'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface DialogShellProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  type?: 'sheet' | 'modal'
  maxWidth?: string
}

export function DialogShell({ 
  isOpen, 
  onClose, 
  children, 
  header,
  footer,
  type = 'sheet',
  maxWidth = 'max-w-2xl'
}: DialogShellProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-velvet-deep/90 backdrop-blur-md z-[80]"
          />
          
          {/* Content Wrapper */}
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={type === 'sheet' ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              animate={type === 'sheet' ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={type === 'sheet' ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className={`
                pointer-events-auto
                relative
                w-full ${maxWidth} mx-auto 
                bg-velvet-deep border-t sm:border border-silver-brushed/10 
                shadow-[0_-20px_60px_rgba(0,0,0,0.8)]
                flex flex-col
                ${type === 'sheet' 
                  ? 'rounded-t-[32px] sm:rounded-[40px] max-h-[95dvh] sm:max-h-[90dvh]' 
                  : 'rounded-[32px] sm:rounded-[40px] max-h-[90dvh]'
                }
              `}
            >
              {type === 'sheet' && (
                 <div className="w-12 h-1 bg-silver-brushed/5 rounded-full mx-auto my-4 silver-border shrink-0" />
              )}
              
              {header && (
                <div className="px-6 sm:px-10 shrink-0">
                  {header}
                </div>
              )}

              <div className={`flex-1 overflow-y-auto px-6 sm:px-10 custom-scrollbar ${footer ? 'pb-6' : 'pb-10 sm:pb-12'}`}>
                {children}
              </div>

              {footer && (
                <div className="px-6 sm:px-10 pb-10 sm:pb-12 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
