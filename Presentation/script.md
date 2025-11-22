# CurePocket Demo Script / デモ動画セリフ

---

## Slide 1: Title / タイトル

### 🇯🇵 日本語
こんにちは。CurePocket（キュアポケット）をご紹介します。
私はShizukuと申します。日本で薬剤師をしています。
チームメンバーのButasanは、リードエンジニアで、機械エンジニアです。
私たち二人はSui Japan Communityのメンバーで普段は日本でSuiの開発者イベントを開催したりしています。

私たちは以前、SuiOverflow'25でショートリストに選ばれ、
Sui × ONE Championshipハッカソンで3位入賞した経験があります。

私が薬剤師として働く中で、多くの患者さんが健康データの管理に困っている様子を見てきました。
そこから、このCurePocketのアイデアが生まれました。

CurePocketは、Suiブロックチェーン上で動作する、グローバルヘルスパスポートです。

### 🇬🇧 English
Hello. I will introduce CurePocket.
My name is Shizuku. I am a pharmacist in Japan.
My team member Butasan is our lead engineer. He is a mechanical engineer.
We are both members of Sui Japan Community and we organize Sui developer events in Japan.

We have experience winning awards at hackathons.
We were selected as a shortlist for SuiOverflow'25.
And we won third place at Sui × ONE Championship hackathon.

As a pharmacist, I saw many patients struggling with health data management.
This gave me the idea for CurePocket.

CurePocket is your global health passport on Sui blockchain.

---

## Slide 2: Problem / 課題

### 🇯🇵 日本語
現在、多くの人が自分の健康データをうまく管理できていません。
服用歴を忘れたり、検査結果の紙をなくしたり。
お薬手帳を持っていないという方も多いです。
特に海外では、健康データを共有することができません。
これらの問題により、安全な医療提供が難しくなっています。

### 🇬🇧 English
Today, many people cannot manage their health data well.
They forget medication history.
They lose paper with lab results.
Many people don't have their medicine notebook.
And abroad, health data cannot be shared.
This makes safe care very difficult.

---

## Slide 3: Vision / ビジョン

### 🇯🇵 日本語
CurePocketは、シンプルでグローバルなヘルスパスポートです。
そして、プライバシーを保護します。
健康データをどこにでも持ち運べます。
共有したいときだけ共有できます。
安全で、プライベートで、ユーザーがコントロールできます。
プライバシーファーストです。

### 🇬🇧 English
CurePocket is a simple, global health passport.
And it protects your privacy.
You can carry your health data anywhere.
You can share only when you want.
It is safe, private, and user-controlled.
Privacy first.

---

## Slide 4: Solution Overview / ソリューション概要

### 🇯🇵 日本語
CurePocketは、暗号化されたデータを保存します。
薬、病気、アレルギー、検査結果、画像、そして毎日のバイタルサインです。
血圧、血糖値、体重などですね。
すべてのデータはSealで暗号化され、Walrusに保存されます。

### 🇬🇧 English
CurePocket stores encrypted data.
Medications, conditions, allergies, lab results, imaging, and daily vitals.
Like blood pressure, glucose, and weight.
All data is encrypted with Seal and stored in Walrus.

---

## Slide 5: Architecture / アーキテクチャ

### 🇯🇵 日本語
アーキテクチャについて説明します。
ヘルスパスポートは、SBT、つまりソウルバウンドトークンです。
譲渡不可能で、ユーザーに紐づいています。
ダイナミックオブジェクトフィールドを使い、医療データを柔軟に追加できます。
各フィールドには、Walrus Blob IDが保存されます。
WalrusとSealにより、オフチェーンで暗号化されたデータを保存します。
ユーザーは必要なときだけ復号化できます。

### 🇬🇧 English
Let me explain the architecture.
Health Passport is an SBT, soul-bound token.
It is non-transferable and bound to the user.
We use dynamic object fields to add medical data flexibly.
Each field stores a Walrus Blob ID.
With Walrus and Seal, we store encrypted data off-chain.
Users can decrypt only when needed.

---

## Slide 6: Architecture Diagram / アーキテクチャ図

### 🇯🇵 日本語
図で見ると、このようになります。
ヘルスパスポートSBTがあり、そこに複数のダイナミックフィールドが接続されています。
各フィールドは、Blob IDを持っています。
そして、暗号化されたデータがWalrusに保存されます。
Sui、Walrus、Sealの技術で実現しています。

### 🇬🇧 English
This is the diagram.
We have Health Passport SBT, and multiple dynamic fields connect to it.
Each field has a Blob ID.
And encrypted data is stored in Walrus.
We use Sui, Walrus, and Seal technology.

---

## Slide 7: Demo Flow / デモフロー

### 🇯🇵 日本語
デモの流れです。
まず、ウォレットを接続します。
次に、ヘルスパスポートSBTを作成します。
プロフィールデータを追加します。
薬、検査結果、バイタルサインを追加します。
Sealで暗号化します。
Walrusにブロブとして保存します。
そして、QRコードで共有できます。

### 🇬🇧 English
This is the demo flow.
First, connect wallet.
Next, create Health Passport SBT.
Add profile data.
Add medications, labs, and vitals.
Encrypt with Seal.
Store blob in Walrus.
And share via QR code.

---

## Slide 8: Future Work / 今後の展開

### 🇯🇵 日本語
今後の展開として、報酬とモチベーションを考えています。
ユーザーは、オプションで匿名化された統計データを共有できます。
そして、報酬を得ることができます。
これにより、人々が毎日の健康データを保存する動機づけになります。
もちろん、プライバシーファーストで、常にユーザーがコントロールします。

### 🇬🇧 English
For future work, we are thinking about earning and motivation.
Users may share fully anonymized statistics optionally.
And users can earn rewards.
This encourages people to save daily health data.
Of course, privacy first and always user-controlled.

---

## Slide 9: Why Sui / Walrus / Seal? / なぜSui / Walrus / Seal?

### 🇯🇵 日本語
なぜSuiを選んだのか。
高速でシンプルなユーザー体験。
安全なオブジェクトモデル。
SBTとダイナミックフィールドに最適です。

なぜWalrusか。
安価でスケーラブルなストレージ。
医療データに理想的です。

なぜSealか。
強力な暗号化。
ユーザーが鍵をコントロールできます。

### 🇬🇧 English
Why Sui?
Fast and simple user experience.
Secure object model.
Perfect for SBT and dynamic fields.

Why Walrus?
Cheap and scalable storage.
Ideal for medical data.

Why Seal?
Strong encryption.
User-owned key control.

---

## Slide 10: Thank You / ありがとうございました

### 🇯🇵 日本語
ご視聴ありがとうございました。
CurePocket。
あなたのグローバルヘルスパスポート、Sui上で。
GitHubでチェックしてください。

### 🇬🇧 English
Thank you for watching.
CurePocket.
Your global health passport on Sui.
Please check our GitHub.

---

## Tips for Presentation / プレゼンのコツ

### 🇯🇵 日本語向け
- 落ち着いてゆっくり話す
- 専門用語は最小限に
- 笑顔で自信を持って

### 🇬🇧 English Tips
- Speak slowly and clearly
- Pause between sentences
- Use simple present tense
- Don't worry about perfect pronunciation
- Practice the technical words: "Sui", "Walrus", "Seal", "SBT", "dynamic fields"
- Smile and be confident!

---

## Estimated Time / 想定時間

- Each slide: 30-45 seconds / 各スライド30〜45秒
- Total: 5-7 minutes / 合計5〜7分
