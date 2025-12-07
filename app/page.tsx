"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function Pomodoro() {
  // --- 1. 配置参数 (全部调整为 5秒 方便测试) ---
  const MODES = {
    focus: 5, 
    short: 5, 
    long: 5, 
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
  
  // 专注次数 (初始化为0，避免服务端渲染不一致)
  const [completedCycles, setCompletedCycles] = useState(0);

  // 音频上下文引用
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- 3. 初始化：读取本地存储 & 权限 ---
  useEffect(() => {
    // A. 读取 LocalStorage (数据持久化)
    const saved = localStorage.getItem("pomodoro_cycles");
    if (saved) {
      // 检查是不是“今天”的数据，如果不是则清零 (可选优化)，这里简单处理先只读
      setCompletedCycles(parseInt(saved, 10));
    }

    // B. 请求通知权限
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // 当 completedCycles 变化时，保存到本地
  useEffect(() => {
    localStorage.setItem("pomodoro_cycles", completedCycles.toString());
  }, [completedCycles]);

  // --- 🔊 4. 音效引擎：清脆悦耳的“叮”声 ---
  const playBeautifulChime = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // 使用正弦波，声音更纯净
      osc.type = "sine";
      
      // 🌟 关键修改：保持频率稳定 (E6 - 1318.51 Hz)，不再降调
      osc.frequency.setValueAtTime(1318.51, t); 
      
      // 音量包络：快速冲击 -> 缓慢衰减 (模拟敲击声)
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.3, t + 0.01); // 瞬间起音
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.5); // 2.5秒悠长余音

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 3); // 3秒后彻底停止

    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // --- 5. 计时逻辑 ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      finishTimer();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const finishTimer = () => {
    setIsActive(false);
    setShowModal(true);
    playBeautifulChime();

    // 通知逻辑
    if (Notification.permission === "granted") {
      new Notification("⏰ 计时结束！", { body: getModalMessage() });
    }

    // 专注模式结束，增加计数
    if (mode === "focus") {
      setCompletedCycles(prev => prev + 1);
    }
  };

  // --- 6. 交互函数 ---
  const toggleTimer = () => {
    // 预加载音频上下文，解锁自动播放
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
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
    setTimeLeft(MODES[mode]); // 关闭后重置时间
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- 7. 文案与样式 ---
  const getModalTitle = () => {
    if (mode === "focus") return "专注完成！";
    if (mode === "long") return "深度休息结束";
    return "小憩结束";
  };

  const getModalMessage = () => {
    if (mode === "focus") return "太棒了！放下工作，站起来伸个懒腰吧。";
    if (mode === "long") return "电量已完全充满！准备好迎接新的挑战了吗？";
    return "休息时间到，准备回到心流状态。";
  };

  const getGradient = () => {
    if (mode === "focus") return "from-orange-50 to-red-100";
    if (mode === "short") return "from-emerald-50 to-teal-100";
    return "from-blue-50 to-indigo-100";
  };

  const getTextColor = () => {
    if (mode === "focus") return "text-orange-950";
    if (mode === "short") return "text-teal-950";
    return "text-indigo-950";
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br ${getGradient()} transition-all duration-700`}>
      
      {/* 顶部标题与价值主张 (新增) */}
      <div className="text-center mb-10 animate-in slide-in-from-top duration-700">
        <h1 className={`text-3xl font-bold tracking-tight mb-2 ${getTextColor()}`}>
          专注番茄钟
        </h1>
        <p className="text-black/40 text-sm font-medium tracking-wide">
          保持心流，适时休息，成就更多
        </p>
      </div>

      {/* 顶部切换 */}
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

      {/* 时钟 */}
      <div className="flex flex-col items-center gap-8 mb-16 relative">
        <div className={`text-[8rem] font-light tracking-tighter tabular-nums leading-none ${getTextColor()} drop-shadow-sm`}>
          {formatTime(timeLeft)}
        </div>
        <div className="absolute -bottom-8 text-black/40 font-medium tracking-wide text-sm uppercase">
          {isActive ? "正在计时..." : "等待开始"}
        </div>
      </div>

      {/* 按钮组 */}
      <div className="flex items-center gap-6">
        <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md flex items-center justify-center text-black/60 transition-all active:scale-95" title="重置">
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

      {/* 专注循环 (数据持久化) */}
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
        <div className="text-xs text-black/30 mt-2">
           累计完成 {completedCycles} 次专注
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-white/50 transform scale-100">
            <h2 className="text-2xl font-semibold mb-2 text-black">
              {getModalTitle()}
            </h2>
            <p className="text-black/60 mb-8 leading-relaxed">
              {getModalMessage()}
            </p>
            <button
              onClick={closeModal}
              className="w-full py-4 rounded-xl bg-black text-white font-medium text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </main>
  );
}