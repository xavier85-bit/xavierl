"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";

export default function Pomodoro() {
  // --- 1. 配置参数 ---
  const MODES = {
    focus: 25 * 60,
    short: 5, // 保持 5秒 方便测试
    long: 15 * 60,
  };

  const MODE_LABELS = {
    focus: "专注模式",
    short: "小憩片刻",
    long: "深度休息",
  };

  // --- 2. 状态管理 ---
  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus);
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // 专注次数统计 (找回丢失的功能)
  const [completedCycles, setCompletedCycles] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 3. 初始化与权限 ---
  useEffect(() => {
    // 使用一个更稳定、清脆的“叮”声
    audioRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3");
    audioRef.current.preload = "auto"; // 强制预加载

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // --- 4. 计时核心逻辑 ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // === 倒计时结束 ===
      finishTimer();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // 结束时的处理
  const finishTimer = () => {
    setIsActive(false); // 停止计时
    setShowModal(true); // 弹窗

    // 播放声音 (重置进度，防止上次没播完)
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("播放失败", e));
    }

    // 发送通知
    if (Notification.permission === "granted") {
      new Notification("⏰ 计时结束！", { 
        body: mode === 'focus' ? "专注完成，休息一下吧！" : "休息结束，准备开始！" 
      });
    }

    // 如果是专注模式结束，增加计数
    if (mode === "focus") {
      setCompletedCycles(prev => prev + 1);
    }
  };

  // --- 5. 交互函数 ---
  
  // 点击“开始”时，尝试激活音频（解决手机端无法自动播放的问题）
  const toggleTimer = () => {
    if (!isActive && audioRef.current) {
      // 播放一个极短的静音或加载，骗过浏览器的“自动播放策略”
      audioRef.current.load();
    }
    setIsActive(!isActive);
  };

  const switchMode = (newMode: "focus" | "short" | "long") => {
    setMode(newMode);
    setTimeLeft(MODES[newMode]);
    setIsActive(false);
    setShowModal(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode]);
  };

  const closeModal = () => {
    setShowModal(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // 自动重置时间
    setTimeLeft(MODES[mode]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- 6. 视觉样式 (Apple Style) ---
  // 根据模式改变背景渐变，模拟 iOS 动态壁纸效果
  const getGradient = () => {
    if (mode === "focus") return "from-orange-50 to-red-100"; // 暖色调
    if (mode === "short") return "from-emerald-50 to-teal-100"; // 清新绿
    return "from-blue-50 to-indigo-100"; // 深邃蓝
  };

  const getTextColor = () => {
    if (mode === "focus") return "text-orange-950";
    if (mode === "short") return "text-teal-950";
    return "text-indigo-950";
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br ${getGradient()} transition-all duration-700`}>
      
      {/* 顶部胶囊切换栏 (iOS Segmented Control 风格) */}
      <div className="bg-black/5 backdrop-blur-xl p-1 rounded-full flex mb-12 shadow-sm">
        {(["focus", "short", "long"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
              ${mode === m 
                ? "bg-white text-black shadow-md scale-100" 
                : "text-black/50 hover:bg-black/5 scale-95"}
            `}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* 核心区域：时钟 + 按钮 */}
      <div className="flex flex-col items-center gap-8 mb-16 relative">
        
        {/* iOS 风格的超大细体时间 */}
        <div className={`text-[8rem] font-light tracking-tighter tabular-nums leading-none ${getTextColor()} drop-shadow-sm`}>
          {formatTime(timeLeft)}
        </div>

        {/* 状态提示文案 */}
        <div className="absolute -bottom-8 text-black/40 font-medium tracking-wide text-sm uppercase">
          {isActive ? "正在计时..." : "等待开始"}
        </div>
      </div>

      {/* 控制按钮组 (更紧凑) */}
      <div className="flex items-center gap-6">
        <button
          onClick={resetTimer}
          className="w-14 h-14 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md flex items-center justify-center text-black/60 transition-all active:scale-95"
          title="重置"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={toggleTimer}
          className={`
            h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90
            ${isActive ? "bg-black/80 text-white" : "bg-white text-black"}
          `}
        >
          {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
      </div>

      {/* 底部：进度追踪 (找回的功能) */}
      <div className="mt-16 flex flex-col items-center gap-3">
        <div className="text-black/30 text-xs font-semibold tracking-widest uppercase">
          今日专注循环
        </div>
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`
                w-4 h-4 rounded-full border-2 transition-all duration-500
                ${i < completedCycles % 4 
                  ? "bg-black border-black scale-110" 
                  : "bg-transparent border-black/20 scale-100"}
              `}
            />
          ))}
        </div>
        <p className="text-xs text-black/30 mt-2">
          {completedCycles > 0 && completedCycles % 4 === 0 
            ? "太棒了！建议进行一次长休息 ☕️" 
            : `再完成 ${4 - (completedCycles % 4)} 个番茄即可长休`}
        </p>
      </div>

      {/* --- 极简弹窗 --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-white/50">
            <h2 className="text-2xl font-semibold mb-2 text-black">
              {mode === "focus" ? "时间到" : "休息结束"}
            </h2>
            <p className="text-black/50 mb-8">
              {mode === "focus" ? "很棒，放下工作休息一下。" : "电量已充满，准备出发！"}
            </p>
            <button
              onClick={closeModal}
              className="w-full py-4 rounded-xl bg-black text-white font-medium text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              停止响铃
            </button>
          </div>
        </div>
      )}
    </main>
  );
}