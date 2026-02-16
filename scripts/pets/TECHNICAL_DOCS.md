# 桌面寵物 (Desktop Pets) 技術傳承文件

## 1. 專案概述

本模組實作了一個在網頁最上層遊走的像素風格寵物系統，包含石虎、台灣黑熊、山椒魚、台灣野兔、山羌等物種。

## 2. 核心挑戰：不規則 Sprite Sheets

我們使用的原始素材並非標準化的遊戲素材，而是人工修圖或 AI 生成的 GIF/PNG 序列，存在以下問題：

- **排列不固定**：部分素材採用 2x2 格子排列，部分採用 1x4 橫條排列。
- **間距不一**：動物之間的距離不固定，且位置經常偏移中心。
- **假透明**：部分背景去背不乾淨，或存在雜點，干擾傳統的邊緣偵測。

## 3. 解決方案演進

由於簡單的網格切割 (Grid Slicing) 與象限偵測 (Quadrant Crop) 均無法完美處理所有素材，我們最終採用了 **全域連通區域分析 (Global Blob Analysis)** 方案。

**處理流程：**

1. **二值化與膨脹**：將圖片轉為黑白並膨脹，讓碎裂的像素黏合成完整的「大區塊」(Blob)。
2. **連通區域標記**：找出畫面上所有獨立的連通區塊。
3. **聯集裁切 (Union Crop)**：針對橫條排列的素材，找出包含所有動作幀的最大外框。
4. **平均分割 (Force Split)**：將最大外框平均垂直切成 4 等份。
5. **自動置中 (Auto-Center)**：將每一幀貼到 **256x256** 的透明畫布中心。

## 4. 腳本結構說明

所有相關腳本已整理至 `scripts/pets/` 目錄下：

### 核心工具 (Core Tools)

這些是維護與新增寵物時會用到的主要腳本：

| 腳本名稱 | 功能描述 | 原始名稱 |
|:---|:---|:---|
| `detect_pet_layout.py` | **分析工具**。執行演算法 (Dilation + Connected Components) 分析圖片，輸出建議的 Union Box 坐標。 | `analyze_layout_global.py` |
| `process_pet_sprites.py` | **執行工具**。根據手動配置的 Union Box，執行「裁切 + 強制均分 + 置中」操作，生成最終素材。 | `slice_manual_hardcoded.py` |
| `pet_slice_config.json` | (選用) 儲存切割坐標設定的設定檔。 | `slice_config.json` |

### 封存區 (Archive)

位於 `scripts/pets/archive/`，存放開發過程中的嘗試與失敗方案（如 Grid Slicing、Quadrant Detection），僅供研究參考。

## 5. 如何新增寵物 (SOP)

1. 準備一張包含 4 個動作幀的透明背景 PNG (例如 `new_pet_walk.png`)，放入 `public/assets/pets/`。
2. 執行分析腳本：

   ```bash
   python scripts/pets/detect_pet_layout.py
   ```

   觀察 `new_pet_walk.png` 輸出的 Union Box 坐標 (例如 `[12, 100, 400, 200]`)。
3. 編輯 `scripts/pets/process_pet_sprites.py`，將坐標填入 `configs` 字典：

   ```python
   configs = {
       # ... 其他寵物 ...
       "new_pet_walk.png": {"bbox": [12, 100, 400, 200], "count": 4}
   }
   ```

4. 執行處理腳本：

   ```bash
   python scripts/pets/process_pet_sprites.py
   ```

5. 檢查 `public/assets/pets/` 下生成的 `_frame_0.png` ~ `_frame_3.png` 是否正確。

---
**文件位置**：`scripts/pets/TECHNICAL_DOCS.md`
