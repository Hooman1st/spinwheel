'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import type { Prize } from '@/lib/supabase'

interface Props {
  prizes: Prize[]
  targetPrizeId: string | null
  isSpinning: boolean
  onSpinComplete: () => void
}

export default function SpinWheel({ prizes, targetPrizeId, isSpinning, onSpinComplete }: Props) {
  const controls = useAnimation()
  const [rotation, setRotation] = useState(0)
  const hasSpun = useRef(false)
  const SIZE = 300
  const CENTER = SIZE / 2
  const RADIUS = CENTER - 10

  const segmentAngle = 360 / prizes.length

  // Calculate the target rotation so the winning segment stops at the top (pointer)
  const calculateTargetRotation = () => {
    if (!targetPrizeId) return rotation + 360 * 5

    const prizeIndex = prizes.findIndex(p => p.id === targetPrizeId)
    if (prizeIndex === -1) return rotation + 360 * 5

    // The pointer is at the top (270° in SVG coords, which is 0° in our rotated wheel)
    // Each segment spans: segmentAngle degrees
    // Center of winning segment should be at 0° (top, under pointer)
    // Segment i center is at: i * segmentAngle + segmentAngle / 2
    const segmentCenter = prizeIndex * segmentAngle + segmentAngle / 2
    // We want segmentCenter to land at 0° (top)
    const neededRotation = 360 - segmentCenter
    // Add multiple full rotations for drama
    const fullSpins = 5 * 360
    const currentBase = rotation % 360
    const delta = ((neededRotation - currentBase) % 360 + 360) % 360
    return rotation + fullSpins + delta
  }

  useEffect(() => {
    if (isSpinning && targetPrizeId && !hasSpun.current) {
      hasSpun.current = true
      const target = calculateTargetRotation()

      controls.start({
        rotate: target,
        transition: {
          duration: 4,
          ease: [0.17, 0.67, 0.35, 1.0], // easeOut-like cubic bezier
        },
      }).then(() => {
        setRotation(target % 360)
        hasSpun.current = false
        onSpinComplete()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, targetPrizeId])

  // Convert polar to cartesian
  const polarToCartesian = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: CENTER + r * Math.cos(rad),
      y: CENTER + r * Math.sin(rad),
    }
  }

  // Build SVG arc path for a segment
  const buildSegmentPath = (index: number) => {
    const startAngle = index * segmentAngle
    const endAngle = startAngle + segmentAngle
    const start = polarToCartesian(startAngle, RADIUS)
    const end = polarToCartesian(endAngle, RADIUS)
    const largeArc = segmentAngle > 180 ? 1 : 0
    return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
  }

  // Text position for a segment
  const getTextPosition = (index: number) => {
    const angle = index * segmentAngle + segmentAngle / 2
    const r = RADIUS * 0.65
    return polarToCartesian(angle, r)
  }

  // Text rotation for a segment
  const getTextRotation = (index: number) => {
    return index * segmentAngle + segmentAngle / 2
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-xl scale-110" />

      {/* Pointer arrow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 wheel-pointer">
        <svg width="28" height="40" viewBox="0 0 28 40">
          <polygon
            points="14,38 2,4 26,4"
            fill="url(#arrowGrad)"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wheel */}
      <motion.div
        animate={controls}
        style={{ rotate: rotation }}
        className="relative z-10"
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="drop-shadow-2xl">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Segments */}
          {prizes.map((prize, i) => {
            const textPos = getTextPosition(i)
            const textRot = getTextRotation(i)
            return (
              <g key={prize.id}>
                <path
                  d={buildSegmentPath(i)}
                  fill={prize.color}
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#shadow)"
                />
                {/* Segment text */}
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRot}, ${textPos.x}, ${textPos.y})`}
                  fill="white"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="Vazirmatn, sans-serif"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                  className="prize-text"
                >
                  {prize.name.length > 7 ? prize.name.slice(0, 6) + '…' : prize.name}
                </text>
              </g>
            )
          })}

          {/* Center circle */}
          <circle cx={CENTER} cy={CENTER} r={24} fill="white" filter="url(#shadow)" />
          <circle cx={CENTER} cy={CENTER} r={20} fill="url(#centerGrad)" />
          <defs>
            <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
          </defs>
          {/* Center star */}
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
          >
            ⭐
          </text>

          {/* Outer ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeOpacity="0.6"
          />
        </svg>
      </motion.div>
    </div>
  )
}
