"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Play, Pause, RotateCcw, Coffee, Brain, Sunset } from "lucide-react"
import { cn } from "@/lib/utils"

type TimerMode = "focus" | "shortBreak" | "longBreak"

interface ModeConfig {
  label: string
  duration: number
  icon: React.ReactNode
  colorClass: string
  bgClass: string
  ringClass: string
  backgroundClass: string
  timerTextClass: string
}

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: "专注",
    duration: 25 * 60,
    icon: <Brain className="w-5 h-5" />,
    colorClass: "text-red-400",
    bgClass: "bg-red-400",
    ringClass: "ring-red-400",
    backgroundClass: "bg-red-50",
    timerTextClass: "text-red-400",
  },
  shortBreak: {
    label: "短休息",
    duration: 5, // Changed to 5 seconds for testing
    icon: <Coffee className="w-5 h-5" />,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-400",
    ringClass: "ring-emerald-400",
    backgroundClass: "bg-emerald-50",
    timerTextClass: "text-emerald-400",
  },
  longBreak: {
    label: "长休息",
    duration: 15 * 60,
    icon: <Sunset className="w-5 h-5" />,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-400",
    ringClass: "ring-blue-400",
    backgroundClass: "bg-blue-50",
    timerTextClass: "text-blue-400",
  },
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("focus")
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const currentMode = MODES[mode]
  const progress = ((currentMode.duration - timeLeft) / currentMode.duration) * 100

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleModeChange = useCallback((newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration)
    setIsRunning(false)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setShowModal(false)
  }, [audio])

  const handleToggle = () => setIsRunning((prev) => !prev)
  const handleReset = () => {
    setTimeLeft(currentMode.duration)
    setIsRunning(false)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setShowModal(false)
  }

  const handleStopSound = () => {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setShowModal(false)
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime <= 0) {
            setIsRunning(false)
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && !showModal) {
      if (mode === "focus") {
        setCompletedSessions((prev) => prev + 1)
      }
      
      // Play sound and show modal
      if (typeof window !== "undefined") {
        const notificationSound = new Audio("https://github.com/maykbrito/libs/raw/master/sounds/notification.mp3")
        notificationSound.play().catch((error) => {
          console.error("Error playing sound:", error)
        })
        setAudio(notificationSound)
        setShowModal(true)
      }
    }
  }, [timeLeft, mode, showModal])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [audio])

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500", currentMode.backgroundClass)}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">番茄计时器</h1>
        <p className="text-muted-foreground">保持专注，适时休息，成就更多</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 p-1.5 bg-muted/50 rounded-xl mb-10 backdrop-blur-sm">
        {(Object.keys(MODES) as TimerMode[]).map((modeKey) => {
          const modeConfig = MODES[modeKey]
          const isActive = mode === modeKey
          return (
            <button
              key={modeKey}
              onClick={() => handleModeChange(modeKey)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                isActive
                  ? `${modeConfig.bgClass} text-white shadow-lg`
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              {modeConfig.icon}
              <span className="hidden sm:inline">{modeConfig.label}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleToggle}
        className={cn(
          "relative w-72 h-72 sm:w-80 sm:h-80 rounded-full cursor-pointer transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-4",
          currentMode.ringClass,
        )}
        aria-label={isRunning ? "暂停计时器" : "开始计时器"}
      >
        {/* Progress Ring */}
        <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 320 320">
          <circle
            cx="160"
            cy="160"
            r="145"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="160"
            cy="160"
            r="145"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            className={cn("transition-all duration-300", currentMode.colorClass)}
            strokeDasharray={`${2 * Math.PI * 145}`}
            strokeDashoffset={`${2 * Math.PI * 145 * (1 - progress / 100)}`}
          />
        </svg>

        {/* Inner Circle with Timer */}
        <div
          className={cn(
            "absolute inset-4 rounded-full flex flex-col items-center justify-center",
            "bg-card/80 backdrop-blur-sm border border-border/50",
            "transition-all duration-300",
          )}
        >
          <span
            className={cn(
              "text-6xl sm:text-7xl font-mono font-bold tracking-tight transition-colors duration-300",
              currentMode.colorClass,
            )}
          >
            {formatTime(timeLeft)}
          </span>

          {/* Play/Pause Icon integrated */}
          <div className={cn("mt-4 flex items-center gap-2 text-muted-foreground transition-colors duration-300")}>
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            <span className="text-sm uppercase tracking-widest">{isRunning ? "点击暂停" : "点击开始"}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-4 mt-8 mb-6">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
          aria-label="重置计时器"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-sm font-medium">重置</span>
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                i < completedSessions % 4 ? currentMode.bgClass : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">已完成 {completedSessions} 个专注时段</span>
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
        完成 4 个专注时段后，可获得一次长休息。坚持使用，效果更佳。
      </p>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleStopSound}
          />
          
          {/* Modal Content */}
          <div className="relative z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 transform transition-all duration-300 ease-out">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Time is up!</h2>
              <p className="text-lg text-muted-foreground">Take a breath.</p>
              <button
                onClick={handleStopSound}
                className={cn(
                  "mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  "active:scale-95"
                )}
              >
                Stop Sound
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <PomodoroTimer />
}
