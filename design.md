import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  FileText, 
  User, 
  Search, 
  Bell, 
  QrCode, 
  Plus, 
  ChevronRight, 
  Heart, 
  Thermometer, 
  Droplet,
  X,
  ShieldCheck,
  Image as ImageIcon,
  Share2,
  Filter,
  Palette,
  Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * CurePocket (キュアポケット)
 * Personal Health Passport UI/UX Design
 * v2.0 - Multi-Theme Support
 */

// --- Themes Configuration ---

const themes = {
  standard: {
    id: 'standard',
    name: 'Standard Teal',
    colors: {
      bg: 'bg-[#F7FAFC]',
      textMain: 'text-[#1A365D]',
      textSub: 'text-slate-500',
      primary: 'bg-[#00B5AD]',
      primaryText: 'text-[#00B5AD]',
      primaryLight: 'bg-[#00B5AD]/10',
      accent: 'bg-[#FF6B6B]',
      accentText: 'text-[#FF6B6B]',
      accentLight: 'bg-[#FF6B6B]/10',
      cardBg: 'bg-white/80 backdrop-blur-md',
      cardBorder: 'border-white/40',
      gradient: 'from-[#00B5AD] to-[#008c85]',
      navBg: 'bg-white/90 backdrop-blur-lg',
      activeTab: 'text-[#00B5AD]',
    },
    rounded: 'rounded-2xl',
    font: 'font-sans',
    shadow: 'shadow-sm',
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Bloom',
    colors: {
      bg: 'bg-[#FAF9F6]', // Warm off-white
      textMain: 'text-[#4A403A]', // Warm dark brown
      textSub: 'text-[#8C847F]',
      primary: 'bg-[#FF9F89]', // Soft Salmon
      primaryText: 'text-[#FF9F89]',
      primaryLight: 'bg-[#FF9F89]/15',
      accent: 'bg-[#A3C9A8]', // Sage Green
      accentText: 'text-[#7FA685]',
      accentLight: 'bg-[#A3C9A8]/20',
      cardBg: 'bg-[#FFFFFF]', // Paper-like, opaque
      cardBorder: 'border-[#F0EBE6]',
      gradient: 'from-[#FF9F89] to-[#FF8566]',
      navBg: 'bg-[#FFFFFF]/95 backdrop-blur-sm',
      activeTab: 'text-[#FF9F89]',
    },
    rounded: 'rounded-[24px]', // Extra rounded
    font: 'font-sans',
    shadow: 'shadow-[4px_4px_0px_0px_rgba(230,220,210,0.5)]', // Soft pop shadow
  },
  urban: {
    id: 'urban',
    name: 'Urban Crystal',
    colors: {
      bg: 'bg-[#F0F4F8]', // Cool Ice Blue tint
      textMain: 'text-[#0F172A]', // Sharp Navy
      textSub: 'text-[#64748B]',
      primary: 'bg-[#3B82F6]', // Electric Blue
      primaryText: 'text-[#3B82F6]',
      primaryLight: 'bg-[#3B82F6]/10',
      accent: 'bg-[#8B5CF6]', // Violet
      accentText: 'text-[#8B5CF6]',
      accentLight: 'bg-[#8B5CF6]/10',
      cardBg: 'bg-white/60 backdrop-blur-xl', // High glass effect
      cardBorder: 'border-white/60',
      gradient: 'from-[#3B82F6] to-[#2563EB]',
      navBg: 'bg-white/70 backdrop-blur-xl',
      activeTab: 'text-[#3B82F6]',
    },
    rounded: 'rounded-xl', // Slightly tighter
    font: 'font-sans',
    shadow: 'shadow-lg shadow-blue-500/5', // Glowing shadow
  }
};

// --- Mock Data ---

const healthScoreData = [
  { day: '月', score: 82 },
  { day: '火', score: 85 },
  { day: '水', score: 84 },
  { day: '木', score: 88 },
  { day: '金', score: 86 },
  { day: '土', score: 90 },
  { day: '日', score: 92 },
];

const medicalHistory = [
  { id: 1, date: '2023.10.15', title: '定期健康診断', hospital: '中央記念病院', type: 'checkup', badge: '完了' },
  { id: 2, date: '2023.09.02', title: '歯科検診・クリーニング', hospital: '鈴木デンタルクリニック', type: 'dental', badge: '良好' },
  { id: 3, date: '2023.05.20', title: '皮膚科受診（アレルギー）', hospital: '青山皮膚科', type: 'visit', badge: '投薬' },
];

const recentDocs = [
  { id: 1, title: '胸部レントゲン', date: '2023.10.15', type: 'X-Ray' },
  { id: 2, title: '血液検査結果', date: '2023.10.15', type: 'PDF' },
  { id: 3, title: '処方箋控え', date: '2023.05.20', type: 'Rx' },
];

// --- Sub Components ---

const GlassCard = ({ children, className = "", onClick, theme }) => (
  <div 
    onClick={onClick}
    className={`
      ${theme.colors.cardBg} 
      border ${theme.colors.cardBorder} 
      ${theme.shadow} 
      ${theme.rounded} 
      p-5 transition-all duration-300 hover:scale-[1.01] 
      ${className}
    `}
  >
    {children}
  </div>
);

const SectionTitle = ({ children, action, theme }) => (
  <div className="flex justify-between items-end mb-4 px-1">
    <h2 className={`text-lg font-bold ${theme.colors.textMain} tracking-wide`}>{children}</h2>
    {action && <button className={`text-xs ${theme.colors.primaryText} font-medium hover:opacity-70 transition-opacity`}>すべて見る</button>}
  </div>
);

const Badge = ({ children, type = 'default', theme }) => {
  let styleClass = 'bg-slate-100 text-slate-600'; // Fallback
  
  if (type === 'default') styleClass = `bg-slate-100 ${theme.colors.textSub}`;
  if (type === 'primary') styleClass = `${theme.colors.primaryLight} ${theme.colors.primaryText}`;
  if (type === 'alert') styleClass = `${theme.colors.accentLight} ${theme.colors.accentText}`;
  if (type === 'gold') styleClass = 'bg-[#F6E05E]/20 text-[#D69E2E]';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${styleClass}`}>
      {children}
    </span>
  );
};

// --- Main Views ---

const Dashboard = ({ onShowQR, theme }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Hero: Health Score */}
      <section className="relative mt-2">
        <GlassCard theme={theme} className={`bg-gradient-to-br ${theme.colors.gradient} text-white border-none relative overflow-hidden !shadow-lg`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">現在の健康スコア</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-inter tracking-tighter">92</span>
                <span className="text-sm opacity-80">/ 100</span>
              </div>
              <p className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm">
                先週より +4 向上しました
              </p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
              <ShieldCheck size={32} className="text-white" />
            </div>
          </div>
          
          {/* Mini Graph inside Hero */}
          <div className="h-16 mt-4 -mx-2 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthScoreData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="score" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      {/* Quick Actions (Horizontal Scroll) */}
      <section>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
          <button onClick={onShowQR} className={`flex-shrink-0 w-20 h-24 bg-white ${theme.rounded} flex flex-col items-center justify-center gap-2 ${theme.shadow} border border-slate-50 active:scale-95 transition-transform`}>
            <div className={`w-10 h-10 rounded-full ${theme.colors.primaryLight} flex items-center justify-center ${theme.colors.primaryText}`}>
              <QrCode size={20} />
            </div>
            <span className={`text-[10px] font-bold ${theme.colors.textSub}`}>共有</span>
          </button>
          
          <button className={`flex-shrink-0 w-20 h-24 bg-white ${theme.rounded} flex flex-col items-center justify-center gap-2 ${theme.shadow} border border-slate-50 active:scale-95 transition-transform`}>
            <div className={`w-10 h-10 rounded-full ${theme.colors.accentLight} flex items-center justify-center ${theme.colors.accentText}`}>
              <Heart size={20} />
            </div>
            <span className={`text-[10px] font-bold ${theme.colors.textSub}`}>緊急</span>
          </button>

          <button className={`flex-shrink-0 w-20 h-24 bg-white ${theme.rounded} flex flex-col items-center justify-center gap-2 ${theme.shadow} border border-slate-50 active:scale-95 transition-transform`}>
            <div className="w-10 h-10 rounded-full bg-[#F6E05E]/20 flex items-center justify-center text-[#D69E2E]">
              <Calendar size={20} />
            </div>
            <span className={`text-[10px] font-bold ${theme.colors.textSub}`}>予約</span>
          </button>
          
          <button className={`flex-shrink-0 w-20 h-24 bg-white ${theme.rounded} flex flex-col items-center justify-center gap-2 ${theme.shadow} border border-slate-50 active:scale-95 transition-transform`}>
             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Plus size={20} />
            </div>
            <span className={`text-[10px] font-bold ${theme.colors.textSub}`}>記録</span>
          </button>
        </div>
      </section>

      {/* Vitals Widgets */}
      <section>
        <SectionTitle theme={theme}>今日のバイタル</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <GlassCard theme={theme} className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 ${theme.colors.textSub} text-xs font-bold uppercase tracking-wider`}>
              <Thermometer size={14} className={theme.colors.accentText} /> 体温
            </div>
            <div className={`text-2xl font-bold font-inter ${theme.colors.textMain}`}>36.5<span className="text-sm font-normal ml-1 opacity-60">°C</span></div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className={`${theme.colors.accent} h-full w-[40%] rounded-full`}></div>
            </div>
          </GlassCard>

          <GlassCard theme={theme} className="flex flex-col gap-3">
             <div className={`flex items-center gap-2 ${theme.colors.textSub} text-xs font-bold uppercase tracking-wider`}>
              <Droplet size={14} className={theme.colors.primaryText} /> 血糖値
            </div>
            <div className={`text-2xl font-bold font-inter ${theme.colors.textMain}`}>98<span className="text-sm font-normal ml-1 opacity-60">mg/dL</span></div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className={`${theme.colors.primary} h-full w-[60%] rounded-full`}></div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Medical History Timeline */}
      <section>
        <SectionTitle theme={theme} action>直近の記録</SectionTitle>
        <div className="relative pl-4 border-l-2 border-slate-100 ml-2 space-y-6">
          {medicalHistory.map((item) => (
            <div key={item.id} className="relative group cursor-pointer">
              <div className={`absolute -left-[21px] top-1.5 w-3 h-3 bg-white border-2 rounded-full group-hover:scale-125 transition-transform ${theme.id === 'standard' ? 'border-[#00B5AD]' : theme.id === 'nordic' ? 'border-[#FF9F89]' : 'border-[#3B82F6]'}`}></div>
              <div className={`bg-white p-4 ${theme.rounded} ${theme.shadow} border border-slate-50 transition-all hover:translate-x-1`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold opacity-50 font-inter tracking-wide`}>{item.date}</span>
                  <Badge theme={theme} type={item.type === 'checkup' ? 'primary' : item.type === 'dental' ? 'gold' : 'alert'}>
                    {item.badge}
                  </Badge>
                </div>
                <h3 className={`font-bold ${theme.colors.textMain} mb-1`}>{item.title}</h3>
                <p className={`text-xs ${theme.colors.textSub} flex items-center gap-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {item.hospital}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const RecordsView = ({ theme }) => (
  <div className="animate-fade-in pb-24 space-y-6">
    <div className="flex items-center justify-between mb-4 mt-2">
      <h2 className={`text-2xl font-bold ${theme.colors.textMain}`}>検査・データ</h2>
      <button className={`p-2 bg-white rounded-full ${theme.shadow} ${theme.colors.textSub} hover:${theme.colors.primaryText}`}>
        <Filter size={20} />
      </button>
    </div>

    {/* Big Chart */}
    <GlassCard theme={theme} className="h-72 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className={`font-bold ${theme.colors.textMain}`}>コレステロール値推移</h3>
          <p className={`text-xs ${theme.colors.textSub}`}>過去6ヶ月の変動</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold font-inter ${theme.colors.textMain}`}>142</p>
          <p className={`text-[10px] ${theme.colors.primaryText} ${theme.colors.primaryLight} px-2 py-0.5 rounded-full inline-block`}>正常範囲内</p>
        </div>
      </div>
      
      <div className="flex-1 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[
            { month: '5月', value: 160 },
            { month: '6月', value: 155 },
            { month: '7月', value: 148 },
            { month: '8月', value: 152 },
            { month: '9月', value: 145 },
            { month: '10月', value: 142 },
          ]}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.id === 'standard' ? '#00B5AD' : theme.id === 'nordic' ? '#FF9F89' : '#3B82F6'} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={theme.id === 'standard' ? '#00B5AD' : theme.id === 'nordic' ? '#FF9F89' : '#3B82F6'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} />
            <Tooltip 
              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              itemStyle={{color: '#666', fontWeight: 'bold'}}
            />
            <Area type="monotone" dataKey="value" stroke={theme.id === 'standard' ? '#00B5AD' : theme.id === 'nordic' ? '#FF9F89' : '#3B82F6'} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>

    <div className="grid grid-cols-2 gap-4">
      {['赤血球数', 'HbA1c', '中性脂肪', '尿酸値'].map((item, i) => (
        <div key={i} className={`bg-white p-4 ${theme.rounded} ${theme.shadow} border border-slate-50 flex flex-col justify-between h-28 hover:opacity-80 transition-colors cursor-pointer`}>
          <div className="flex justify-between items-start">
            <span className={`text-xs font-bold ${theme.colors.textSub}`}>{item}</span>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
          <div className="mt-auto">
             <span className={`text-xl font-bold font-inter ${theme.colors.textMain}`}>
               {4 + (i * 1.2).toFixed(1)}
             </span>
             <span className="text-[10px] text-slate-400 ml-1">単位</span>
          </div>
           <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
             <div style={{width: `${60 + (i * 10)}%`}} className={`h-full ${theme.colors.textMain} rounded-full opacity-60`}></div>
           </div>
        </div>
      ))}
    </div>
  </div>
);

const FilesView = ({ theme }) => (
  <div className="animate-fade-in pb-24">
    <div className="flex items-center justify-between mb-6 mt-2">
      <h2 className={`text-2xl font-bold ${theme.colors.textMain}`}>画像・書類</h2>
      <button className={`p-2 ${theme.colors.primary} text-white rounded-full shadow-lg active:scale-95 transition-transform`}>
        <Plus size={20} />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {recentDocs.map((doc) => (
        <div key={doc.id} className={`relative aspect-square bg-slate-100 ${theme.rounded} overflow-hidden group cursor-pointer`}>
           {/* Placeholder for images */}
           <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
             {doc.type === 'X-Ray' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <div className="text-white/20 text-4xl font-bold">X-RAY</div>
                </div>
             ) : (
                <FileText size={32} className="text-slate-400" />
             )}
           </div>
           
           {/* Overlay */}
           <div className={`absolute inset-0 bg-gradient-to-t ${theme.id === 'nordic' ? 'from-[#4A403A]/80' : 'from-[#1A365D]/80'} to-transparent flex flex-col justify-end p-4`}>
             <p className="text-white font-bold text-sm truncate">{doc.title}</p>
             <p className="text-white/70 text-[10px] font-inter">{doc.date}</p>
           </div>
           
           <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium border border-white/20">
             {doc.type}
           </div>
        </div>
      ))}
      
      {/* Upload Placeholder */}
      <div className={`aspect-square ${theme.rounded} border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group`}>
         <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:${theme.colors.primaryLight} group-hover:${theme.colors.primaryText} transition-colors`}>
           <ImageIcon size={20} />
         </div>
         <span className="text-xs text-slate-400 font-bold">追加する</span>
      </div>
    </div>
  </div>
);

// --- QR Modal ---

const QRModal = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-white w-full max-w-sm ${theme.rounded} p-8 shadow-2xl transform transition-all scale-100`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
        
        <div className="text-center space-y-6">
          <div>
            <h3 className={`text-xl font-bold ${theme.colors.textMain}`}>医療情報の共有</h3>
            <p className={`text-sm ${theme.colors.textSub} mt-2`}>医師にこのQRコードを提示して<br/>カルテ情報を共有します</p>
          </div>
          
          <div className={`w-64 h-64 mx-auto bg-slate-900 ${theme.rounded} p-4 flex items-center justify-center shadow-inner relative overflow-hidden group cursor-pointer`}>
            <div className={`absolute inset-0 bg-gradient-to-tr ${theme.colors.gradient} opacity-20 group-hover:opacity-40 transition-opacity`}></div>
            {/* Fake QR Pattern */}
            <div className={`w-full h-full bg-white p-2 ${theme.id === 'nordic' ? 'rounded-lg' : 'rounded-sm'} grid grid-cols-5 grid-rows-5 gap-1`}>
               {[...Array(25)].map((_, i) => (
                 <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-[#1A365D]' : 'bg-transparent'}`}></div>
               ))}
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-white p-1 rounded-full">
                    <ShieldCheck className={theme.colors.primaryText} size={32} />
                 </div>
               </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            有効期限: 04:59
          </div>
          
          <button className={`w-full py-3 bg-slate-100 ${theme.colors.textMain} font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors`}>
            <Share2 size={18} />
            リンクとしてコピー
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Theme Switcher Component ---
const ThemeSwitcher = ({ currentTheme, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-white rounded-2xl p-2 shadow-xl border border-slate-100 flex flex-col gap-2 mb-2 animate-fade-in w-48">
          <p className="px-2 py-1 text-xs text-slate-400 font-bold">テーマを選択</p>
          {Object.values(themes).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setIsOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${currentTheme === t.id ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-500'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${t.colors.gradient}`}></div>
              {t.name}
              {currentTheme === t.id && <Check size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-white shadow-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {isOpen ? <X size={20} /> : <Palette size={20} />}
      </button>
    </div>
  );
};

// --- App Component ---

const CurePocketApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState('standard');
  
  const theme = themes[currentThemeId];

  // Initial Load Animation Simulation
  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#F7FAFC] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 bg-[#00B5AD] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00B5AD]/30 animate-pulse relative z-10">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-[#1A365D] tracking-widest uppercase">CurePocket</h1>
        <div className="absolute bottom-10 w-8 h-8 border-2 border-[#00B5AD] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.colors.bg} transition-colors duration-500 font-sans selection:${theme.colors.primaryLight}`}>
       <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap');
          .font-sans { font-family: 'Noto Sans JP', sans-serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        `}
      </style>

      {/* Main Container */}
      <div className={`max-w-md mx-auto min-h-screen relative shadow-2xl ${theme.colors.bg} overflow-hidden transition-colors duration-500`}>
        
        {/* Header */}
        <header className={`px-6 pt-8 pb-2 flex justify-between items-center sticky top-0 z-30 ${theme.colors.bg} transition-colors duration-500`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${theme.id === 'nordic' ? 'from-[#FF9F89] to-[#FF8566]' : theme.id === 'urban' ? 'from-[#3B82F6] to-[#0F172A]' : 'from-[#1A365D] to-[#2c5282]'} flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 transition-transform`}>
              <span className="font-bold text-sm">Y.T</span>
            </div>
            <div>
              <p className={`text-xs ${theme.colors.textSub}`}>こんにちは、</p>
              <h1 className={`text-lg font-bold ${theme.colors.textMain} leading-tight`}>田中 優子さん</h1>
            </div>
          </div>
          <div className="flex gap-3">
             <button className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${theme.shadow} ${theme.colors.textSub} hover:${theme.colors.primaryText} transition-colors relative`}>
               <Bell size={20} />
               <span className={`absolute top-2 right-2 w-2 h-2 ${theme.colors.accent} rounded-full border border-white`}></span>
             </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="px-6 py-4 overflow-y-auto h-[calc(100vh-80px)] scrollbar-hide">
          {activeTab === 'home' && <Dashboard onShowQR={() => setShowQR(true)} theme={theme} />}
          {activeTab === 'records' && <RecordsView theme={theme} />}
          {activeTab === 'files' && <FilesView theme={theme} />}
          {activeTab === 'profile' && (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-fade-in">
               <User size={48} className="mb-4 opacity-50" />
               <p>プロフィール設定画面</p>
             </div>
          )}
        </main>

        {/* Theme Switcher Button */}
        <ThemeSwitcher currentTheme={currentThemeId} setTheme={setCurrentThemeId} />

        {/* Bottom Navigation */}
        <nav className={`absolute bottom-0 w-full ${theme.colors.navBg} border-t border-slate-100 pb-6 pt-2 px-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-40 transition-colors duration-500`}>
          <div className="flex justify-between items-center">
            {[
              { id: 'home', icon: Activity, label: 'ホーム' },
              { id: 'records', icon: Calendar, label: '記録' },
              { id: 'add', icon: Plus, label: '', isFab: true },
              { id: 'files', icon: FileText, label: 'データ' },
              { id: 'profile', icon: User, label: '私' },
            ].map((item) => (
              item.isFab ? (
                <button 
                  key={item.id}
                  className={`w-14 h-14 -mt-8 bg-gradient-to-tr ${theme.colors.gradient} rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform`}
                >
                  <Plus size={28} />
                </button>
              ) : (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-1 w-12 transition-colors duration-300 ${
                    activeTab === item.id ? theme.colors.activeTab : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                  <span className="text-[10px] font-bold">{item.label}</span>
                </button>
              )
            ))}
          </div>
        </nav>

        {/* Modals */}
        <QRModal isOpen={showQR} onClose={() => setShowQR(false)} theme={theme} />
        
        {/* Background Decorative Blobs (Dynamic) */}
        <div className={`absolute top-20 -left-20 w-64 h-64 ${theme.colors.primary} opacity-5 rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-1000`}></div>
        <div className={`absolute bottom-40 -right-20 w-80 h-80 ${theme.colors.accent} opacity-5 rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-1000`}></div>

      </div>
    </div>
  );
};

export default CurePocketApp;