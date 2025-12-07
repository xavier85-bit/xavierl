"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Share, X } from "lucide-react";

export default function Pomodoro() {
  // --- 配置 ---
  const MODES = {
    focus: 5, // 测试用 5秒，正式用请改为 25 * 60
    short: 5, 
    long: 5, 
  };

  const MODE_LABELS = {
    focus: "专注模式",
    short: "小憩片刻",
    long: "深度休息",
  };

  // --- 状态 ---
  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus);
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  
  // 新增：控制安装引导弹窗
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  // 新增：用于后台保活的静音音频
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  // 新增：结束时间的“绝对时间戳” (解决后台时间停止问题)
  const endTimeRef = useRef<number | null>(null);

  // 音频上下文 (用于播放提示音)
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- 初始化 ---
  useEffect(() => {
    // 读取本地存储
    const saved = localStorage.getItem("pomodoro_cycles");
    if (saved) setCompletedCycles(parseInt(saved, 10));

    // 请求通知权限 (iOS PWA 必须添加到桌面后才有效)
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // 初始化静音音频 (黑科技：循环播放空白音，防止手机锁屏杀后台)
    // 这是一段 1秒钟的完全静音 MP3 base64
    const silentBase64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbQAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA";
    silentAudioRef.current = new Audio(silentBase64);
    if(silentAudioRef.current) {
      silentAudioRef.current.loop = true;
      silentAudioRef.current.volume = 0.01; // 极小音量
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pomodoro_cycles", completedCycles.toString());
  }, [completedCycles]);

  // --- 🔊 提示音引擎 ---
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

      osc.type = "sine";
      osc.frequency.setValueAtTime(1318.51, t); 
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.5, t + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 3);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 3.5);

    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // --- ⏱️ 核心计时逻辑 (升级版：时间戳校准) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive) {
      // 如果刚开始，设定一个未来的结束时间戳
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      interval = setInterval(() => {
        if (!endTimeRef.current) return;
        
        // 计算剩余时间 = 目标时间 - 当前真实时间
        // 这样即使锁屏，只要代码还能跑一下，时间就是准的
        const now = Date.now();
        const diff = Math.ceil((endTimeRef.current - now) / 1000);

        if (diff <= 0) {
          setTimeLeft(0);
          finishTimer();
          clearInterval(interval);
        } else {
          setTimeLeft(diff);
        }
      }, 1000);
    } else {
      // 暂停时，清除结束时间戳，这样下次开始会重新计算
      endTimeRef.current = null;
    }

    return () => clearInterval(interval);
  }, [isActive]); // 这里移除了 timeLeft 依赖，改为依赖内部计算

  const finishTimer = () => {
    setIsActive(false);
    endTimeRef.current = null;
    setShowModal(true);
    playBeautifulChime();
    
    // 停止静音保活循环
    silentAudioRef.current?.pause();

    // 尝试发送系统级通知 (锁屏可见)
    // 注意：iOS 需要 App 被添加到桌面 (PWA) 才能支持 Notification API
    if (Notification.permission === "granted") {
      // 尝试在 ServiceWorker 注册的情况下发送 (更高级)，或者普通发送
      // 这里使用普通发送，部分新版 iOS 支持
      try {
        new Notification("⏰ 计时结束！", { 
          body: getModalMessage(),
          icon: "/icon.svg",
          vibrate: [200, 100, 200]
        });
      } catch (e) { console.log("Notification failed", e); }
    }

    if (mode === "focus") {
      setCompletedCycles(prev => prev + 1);
    }
  };

  // --- 交互 ---
  const toggleTimer = () => {
    // 1. 启动/停止 静音保活音频
    if (!isActive) {
      // 开始计时：播放静音，欺骗系统
      silentAudioRef.current?.play().catch(() => {});
      
      // 预热提示音上下文
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } else {
      // 暂停计时：停止静音
      silentAudioRef.current?.pause();
      // 更新当前的 timeLeft，防止暂停后再开始时间跳跃
      if (endTimeRef.current) {
        const now = Date.now();
        const diff = Math.ceil((endTimeRef.current - now) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
      }
      endTimeRef.current = null;
    }
    
    setIsActive(!isActive);
  };

  const switchMode = (newMode: "focus" | "short" | "long") => {
    setMode(newMode);
    setTimeLeft(MODES[newMode]);
    setIsActive(false);
    endTimeRef.current = null;
    setShowModal(false);
    silentAudioRef.current?.pause();
  };

  const resetTimer = () => {
    setIsActive(false);
    endTimeRef.current = null;
    setTimeLeft(MODES[mode]);
    silentAudioRef.current?.pause();
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeLeft(MODES[mode]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getModalTitle = () => mode === "focus" ? "专注完成！" : "休息结束";
  const getModalMessage = () => mode === "focus" ? "太棒了！放下工作，站起来伸个懒腰吧。" : "电量已充满！准备好出发了吗？";
  const getGradient = () => mode === "focus" ? "from-orange-50 to-red-100" : mode === "short" ? "from-emerald-50 to-teal-100" : "from-blue-50 to-indigo-100";
  const getTextColor = () => mode === "focus" ? "text-orange-950" : mode === "short" ? "text-teal-950" : "text-indigo-950";

  // 检测是否为 iOS 设备 (用于显示不同的安装教程)
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br ${getGradient()} transition-all duration-700 relative`}>
      
      {/* 右上角：添加到主屏幕按钮 */}
      <button 
        onClick={() => setShowInstallGuide(true)}
        className="absolute top-6 right-6 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors text-black/60"
        title="安装到手机"
      >
        <Share size={20} />
      </button>

      {/* 标题 */}
      <div className="text-center mb-10 animate-in slide-in-from-top duration-700 mt-8">
        <h1 className={`text-3xl font-bold tracking-tight mb-2 ${getTextColor()}`}>
          专注番茄钟
        </h1>
        <p className="text-black/40 text-sm font-medium tracking-wide">
          保持心流，适时休息
        </p>
      </div>

      {/* 切换栏 */}
      <div className="bg-black/5 backdrop-blur-xl p-1 rounded-full flex mb-12 shadow-sm">
        {(["focus", "short", "long"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
              ${mode === m ? "bg-white text-black shadow-md scale-100" : "text-black/50 hover:bg-black/5 scale-95"}
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
        <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md flex items-center justify-center text-black/60 transition-all active:scale-95">
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

      {/* 底部圆点 */}
      <div className="mt-16 flex flex-col items-center gap-3">
        <div className="text-black/30 text-xs font-semibold tracking-widest uppercase">今日专注循环</div>
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${i < completedCycles % 4 ? "bg-black border-black scale-110" : "bg-transparent border-black/20 scale-100"}`} />
          ))}
        </div>
        <div className="text-xs text-black/30 mt-2">累计完成 {completedCycles} 次</div>
      </div>

      {/* 计时结束弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-white/50">
            <h2 className="text-2xl font-semibold mb-2 text-black">{getModalTitle()}</h2>
            <p className="text-black/60 mb-8 leading-relaxed">{getModalMessage()}</p>
            <button onClick={closeModal} className="w-full py-4 rounded-xl bg-black text-white font-medium text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 安装引导弹窗 (Add to Home Screen) */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInstallGuide(false)}>
          <div className="bg-white p-6 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInstallGuide(false)} className="absolute top-4 right-4 p-2 text-black/30 hover:text-black">
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-red-500 rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center text-white text-2xl font-bold">🍅</div>
            <h3 className="text-xl font-bold mb-2 text-black">安装 App 到手机</h3>
            <p className="text-black/60 text-sm mb-6">
              为了获得最佳体验（全屏运行 + 后台提醒），请将应用添加到主屏幕。
            </p>
            
            {/* iOS 指引 */}
            {isIOS ? (
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 text-sm text-black/70">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold">1</span>
                  <span>点击底部浏览器的 <Share size={14} className="inline mx-1" /> 分享按钮</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold">2</span>
                  <span>向下滑动，选择 <strong>"添加到主屏幕"</strong></span>
                </div>
              </div>
            ) : (
               /* 安卓/其他指引 */
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 text-sm text-black/70">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold">1</span>
                  <span>点击浏览器右上角的菜单 (⋮)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold">2</span>
                  <span>选择 <strong>"安装应用"</strong> 或 <strong>"添加到主屏幕"</strong></span>
                </div>
              </div>
            )}
            
            <button onClick={() => setShowInstallGuide(false)} className="w-full mt-6 py-3 rounded-xl bg-black/5 hover:bg-black/10 font-medium text-black transition-all">
              关闭
            </button>
          </div>
        </div>
      )}
    </main>
  );
}