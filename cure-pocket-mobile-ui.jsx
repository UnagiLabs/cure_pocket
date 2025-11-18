import React, { useState } from 'react';
import { User, Package, Calendar, Shield, Plus, Camera, FileText, QrCode, AlertCircle, Sun, Cloud, Moon, Download, Printer, Check, TrendingUp, Clock, ChevronLeft, Home, List, Share2, CreditCard, Menu } from 'lucide-react';

const CurePocketApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showMenu, setShowMenu] = useState(false);

  const medications = [
    { id: 1, name: 'ロスバスタチン', dose: '5mg', frequency: '1日1回', timing: '朝', clinic: '○○内科', type: 'tablet' },
    { id: 2, name: 'メトホルミン', dose: '500mg', frequency: '1日2回', timing: '昼', clinic: '△△クリニック', type: 'tablet', warning: '食直前' },
    { id: 3, name: 'アムロジピン', dose: '5mg', frequency: '1日1回', timing: '朝', clinic: '○○内科', type: 'tablet' },
  ];

  const HomeScreen = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 p-4 pb-20">
        <div className="mb-6">
          <h2 className="text-lg text-gray-700 mb-1">こんにちは</h2>
          <h1 className="text-2xl font-bold text-gray-900">沼水さん</h1>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-white mr-3" />
              <span className="text-white text-lg font-medium">服用中の薬</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">8種類</div>
          <div className="text-white/80 text-sm mt-1">最終更新: 2分前</div>
        </div>

        <button className="w-full bg-green-500 text-white rounded-xl p-4 flex items-center justify-center mb-6 shadow-md active:scale-95 transition-transform">
          <QrCode className="w-6 h-6 mr-2" />
          <span className="font-medium">QRコードで薬を追加</span>
          <Camera className="w-5 h-5 ml-2" />
        </button>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button 
            onClick={() => setActiveTab('medications')}
            className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
          >
            <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <span className="text-xs text-gray-700 font-medium">お薬</span>
          </button>
          <button className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <Calendar className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <span className="text-xs text-gray-700 font-medium">履歴</span>
          </button>
          <button 
            onClick={() => setActiveTab('share')}
            className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
          >
            <Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <span className="text-xs text-gray-700 font-medium">共有</span>
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('emergency')}
          className="w-full bg-red-50 border-2 border-red-200 text-red-600 rounded-xl p-4 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <AlertCircle className="w-6 h-6 mr-2" />
          <span className="font-medium">緊急カード生成</span>
        </button>
      </div>
    </div>
  );

  const MedicationsScreen = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => setActiveTab('home')} className="mr-3">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">服用中のお薬</h1>
      </div>

      <div className="flex-1 p-4 pb-20 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <Sun className="w-5 h-5 text-orange-400 mr-2" />
            <span className="text-gray-700 font-medium">朝</span>
            <div className="flex-1 h-px bg-gray-300 ml-3"></div>
          </div>
          {medications.filter(m => m.timing === '朝').map(med => (
            <div key={med.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">💊</span>
                    <span className="font-bold text-gray-900">{med.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{med.dose} / {med.frequency}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-1">🏥</span>
                    {med.clinic}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <Cloud className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-gray-700 font-medium">昼</span>
            <div className="flex-1 h-px bg-gray-300 ml-3"></div>
          </div>
          {medications.filter(m => m.timing === '昼').map(med => (
            <div key={med.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">💊</span>
                    <span className="font-bold text-gray-900">{med.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{med.dose} / {med.frequency}</div>
                  {med.warning && (
                    <div className="text-sm text-orange-600 font-medium flex items-center mb-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {med.warning}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-1">🏥</span>
                    {med.clinic}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setActiveTab('add')}
          className="w-full bg-blue-500 text-white rounded-xl p-4 flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-medium">新しい薬を追加</span>
        </button>
      </div>
    </div>
  );

  const AddMedicationScreen = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => setActiveTab('medications')} className="mr-3">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">薬を追加</h1>
      </div>

      <div className="flex-1 p-4">
        <p className="text-gray-700 mb-6 text-center">追加方法を選択してください</p>

        <button className="w-full bg-white rounded-xl p-6 mb-4 shadow-sm active:scale-95 transition-transform">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-3 mr-4">
              <Camera className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 mb-1">QRコードスキャン</div>
              <div className="text-sm text-gray-600">処方箋のQRコードを読み取り</div>
            </div>
          </div>
        </button>

        <button className="w-full bg-white rounded-xl p-6 mb-4 shadow-sm active:scale-95 transition-transform">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-3 mr-4">
              <span className="text-2xl">🔢</span>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 mb-1">バーコードスキャン</div>
              <div className="text-sm text-gray-600">薬のパッケージから読み取り</div>
            </div>
          </div>
        </button>

        <button className="w-full bg-white rounded-xl p-6 mb-6 shadow-sm active:scale-95 transition-transform">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-full p-3 mr-4">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 mb-1">手動入力</div>
              <div className="text-sm text-gray-600">薬の情報を直接入力</div>
            </div>
          </div>
        </button>

        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">💡</span>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">ヒント</p>
              <p>処方箋のQRコードや薬のバーコードから簡単に登録できます</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ShareScreen = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => setActiveTab('home')} className="mr-3">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">データ共有</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-500" />
            アクセス管理
          </h2>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="mb-3">
              <div className="font-bold text-gray-900 mb-2">医師への一時共有</div>
              <button className="w-full bg-blue-500 text-white rounded-lg p-3 mb-3 active:scale-95 transition-transform">
                <QrCode className="w-5 h-5 inline mr-2" />
                QRコード生成
              </button>
              <div className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                有効期限: 24時間
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            匿名データ提供
          </h2>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-900">研究への貢献</span>
              <div className="bg-green-100 rounded-full p-1">
                <Check className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">獲得報酬</span>
                <span className="font-bold text-green-600">125 SUI 💰</span>
              </div>
            </div>
            <button className="text-blue-600 text-sm font-medium">詳細を見る →</button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <span className="text-xl mr-2">🌐</span>
            Walrus保存状態
          </h2>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">暗号化済み</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">最終同期: 2分前</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EmergencyScreen = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => setActiveTab('home')} className="mr-3">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          緊急時お薬情報
        </h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <div className="bg-gray-100 rounded-xl p-8 mb-4 flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">スキャンすると</p>
              <p className="text-sm text-gray-600">英語版も表示</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3">服用薬一覧</h3>
          <ul className="space-y-2">
            <li className="flex items-center text-gray-700">
              <span className="mr-2">•</span>
              ロスバスタチン 5mg
            </li>
            <li className="flex items-center text-gray-700">
              <span className="mr-2">•</span>
              メトホルミン 500mg
            </li>
            <li className="flex items-center text-gray-700">
              <span className="mr-2">•</span>
              アムロジピン 5mg
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button className="w-full bg-blue-500 text-white rounded-xl p-4 flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <Download className="w-5 h-5 mr-2" />
            <span className="font-medium">PDFダウンロード</span>
          </button>
          <button className="w-full bg-gray-700 text-white rounded-xl p-4 flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <Printer className="w-5 h-5 mr-2" />
            <span className="font-medium">印刷用カード生成</span>
          </button>
        </div>
      </div>
    </div>
  );

  const screens = {
    home: <HomeScreen />,
    medications: <MedicationsScreen />,
    add: <AddMedicationScreen />,
    share: <ShareScreen />,
    emergency: <EmergencyScreen />
  };

  return (
    <div className="w-full max-w-md mx-auto h-screen bg-white relative overflow-hidden">
      {/* ステータスバー */}
      <div className="bg-blue-500 text-white p-2 text-xs flex justify-between items-center">
        <span>9:41</span>
        <div className="flex items-center space-x-1">
          <span>🔋</span>
          <span>📶</span>
          <span>📡</span>
        </div>
      </div>

      {/* ヘッダー */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🏥</span>
          <span className="text-xl font-bold">CurePocket</span>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="h-full">
        {screens[activeTab]}
      </div>

      {/* ボトムナビゲーション */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">ホーム</span>
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex flex-col items-center p-2 ${activeTab === 'medications' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <List className="w-6 h-6" />
            <span className="text-xs mt-1">お薬</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <div className="bg-green-500 rounded-full p-2 mb-1">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs">追加</span>
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex flex-col items-center p-2 ${activeTab === 'share' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Share2 className="w-6 h-6" />
            <span className="text-xs mt-1">共有</span>
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex flex-col items-center p-2 ${activeTab === 'emergency' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-xs mt-1">緊急</span>
          </button>
        </div>
      </div>

      {/* メニュー（オーバーレイ） */}
      {showMenu && (
        <div className="absolute inset-0 bg-black/50 z-50" onClick={() => setShowMenu(false)}>
          <div className="absolute right-0 top-20 bg-white rounded-l-xl p-4 w-64" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg">
                <div className="font-medium">プロフィール設定</div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg">
                <div className="font-medium">データエクスポート</div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg">
                <div className="font-medium">言語設定</div>
              </button>
              <div className="border-t pt-3">
                <div className="text-sm text-gray-500 px-3">
                  <div>ウォレット接続中</div>
                  <div className="text-xs mt-1">0x1234...5678</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind CSSのスタイル */}
      <style jsx>{`
        /* Tailwind基本クラスのインライン定義 */
      `}</style>
    </div>
  );
};

export default CurePocketApp;