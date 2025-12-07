"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Battery } from "lucide-react";

export default function Pomodoro() {
  // 1. 定义三种模式的时间（单位：秒）
  // 注意：短休息 (short) 设定为 5 秒，方便测试
  const MODES = {
    focus: 25 * 60,
    short: 5, 
    long: 15 * 60,
  };

  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus);
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false); // 控制弹窗显示的“开关”

  // 2. 使用 useRef 创建音频对象，保证它只被初始化一次，不会被垃圾回收
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 初始化音频 (使用一个稳定的在线音效)
    audioRef.current = new Audio("https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8c8a73467.mp3");
    
    // 请求浏览器通知权限
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // 3. 核心计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // === 当倒计时归零那一刻 (且计时器还是激活状态) ===
      
      // A. 立刻停止计时 (防止死循环的关键！)
      setIsActive(false);
      
      // B. 打开弹窗
      setShowModal(true);

      // C. 播放声音
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // 从头播放
        audioRef.current.play().catch((err) => console.log("音频播放失败:", err));
      }

      // D. 发送浏览器通知
      if (Notification.permission === "granted") {
        const title = mode === "focus" ? "🎉 专注完成！" : "🔔 休息结束！";
        const body = mode === "focus" ? "太棒了！起来活动一下吧。" : "准备好开始新的专注了吗？";
        new Notification(title, { body });
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // 切换模式的函数
  const switchMode = (newMode: "focus" | "short" | "long") => {
    setMode(newMode);
    setTimeLeft(MODES[newMode]);
    setIsActive(false);
    setShowModal(false);
  };

  // 格式化时间 (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 关闭弹窗并停止声音
  const handleCloseModal = () => {
    setShowModal(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // 可选：重置当前模式的时间
    setTimeLeft(MODES[mode]); 
  };

  // 根据模式决定背景色
  const getBgColor = () => {
    if (mode === "focus") return "bg-red-50 text-red-900";
    if (mode === "short") return "bg-green-50 text-green-900";
    return "bg-blue-50 text-blue-900";
  };

  const getButtonColor = () => {
    if (mode === "focus") return "bg-red-100 hover:bg-red-200 text-red-700";
    if (mode === "short") return "bg-green-100 hover:bg-green-200 text-green-700";
    return "bg-blue-100 hover:bg-blue-200 text-blue-700";
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-500 ${getBgColor()}`}>
      
      {/* 顶部标题 */}
      <h1 className="text-3xl font-bold mb-8 tracking-tight">专注番茄钟</h1>

      {/* 模式切换按钮 */}
      <div className="flex gap-2 mb-12 bg-white/50 p-2 rounded-full backdrop-blur-sm">
        <button
          onClick={() => switchMode("focus")}
          className={`px-6 py-2 rounded-full transition-all ${mode === "focus" ? "bg-white shadow-sm font-medium" : "hover:bg-white/50"}`}
        >
          专注
        </button>
        <button
          onClick={() => switchMode("short")}
          className={`px-6 py-2 rounded-full transition-all ${mode === "short" ? "bg-white shadow-sm font-medium" : "hover:bg-white/50"}`}
        >
          短休息
        </button>
        <button
          onClick={() => switchMode("long")}
          className={`px-6 py-2 rounded-full transition-all ${mode === "long" ? "bg-white shadow-sm font-medium" : "hover:bg-white/50"}`}
        >
          长休息
        </button>
      </div>

      {/* 倒计时大数字 */}
      <div className="text-[120px] font-bold leading-none mb-12 font-mono tracking-tighter">
        {formatTime(timeLeft)}
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`h-24 w-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-transform hover:scale-105 active:scale-95 ${mode === 'focus' ? 'bg-red-500 text-white' : mode === 'short' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}
        >
          {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
        </button>
        
        <button
          onClick={() => {
            setIsActive(false);
            setTimeLeft(MODES[mode]);
          }}
          className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
        >
          <RotateCcw size={24} />
        </button>
      </div>

      {/* 底部提示 */}
      <div className="mt-12 text-center opacity-60">
        <p>{isActive ? (mode === "focus" ? "保持专注..." : "放松身心...") : "点击开始计时"}</p>
      </div>

      {/* --- 弹窗 Modal --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all scale-100">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${mode === 'focus' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {mode === 'focus' ? <Coffee size={32} /> : <Brain size={32} />}
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              {mode === "focus" ? "专注完成！" : "休息结束！"}
            </h2>
            
            <p className="text-gray-500 mb-8">
              {mode === "focus" 
                ? "干得漂亮！现在是休息时间，去喝杯水吧。" 
                : "电量已充满！准备好开始下一轮专注了吗？"}
            </p>

            <button
              onClick={handleCloseModal}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg hover:brightness-110 transition-all ${mode === 'focus' ? 'bg-red-500' : 'bg-green-600'}`}
            >
              我知道了 (停止声音)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}