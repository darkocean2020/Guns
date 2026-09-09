# HARBOR / ZERO — 东京港区

单人俯视角搜打撤小游戏，使用 Blender 制作的东京港口主题地图和原创鸟类角色。原枪械模型、贴图和 Blender 文件均保留，并在新游戏中复用。场景为原创组合，不是东京港真实测绘复刻，也未使用《逃离鸭科夫》的角色或素材。

## 运行

在项目目录运行 `./Start-Harbor.ps1`，打开 http://localhost:3000/ 。需 Node.js 22.13+ 与支持 WebGL2 的桌面浏览器。首次安装依赖需要网络。推荐 1280×800 以上窗口。

## 完整行动流程

大厅选择七种枪械之一 → 从南侧潜入 → 搜索补给箱、对抗 8 名巡逻敌人 → 可选取得北侧海关箱内货运清单 → 8 分钟内到东北侧绿色撤离区，按 E 等待 6 秒 → 回安全屋出售物资。

Glock 免费；其他武器收取押金，成功撤离返还。带回清单另得 ¥2,500。死亡或超时丢失本局物资与装备押金，既有仓库不受影响。背包负重 12 kg。初始资金 ¥6,000。存档写入当前浏览器 localStorage；清除站点数据会重置，未提供云存档或多人模式。

- WASD 移动，Shift 冲刺，鼠标瞄准，左键射击（AK-47 可按住连发）。
- E 搜索/打开箱子/呼叫撤离，R 换弹，H 使用急救包。
- Tab 背包，M 地图，Esc 关闭面板/暂停。失去窗口焦点自动暂停。
- 物品栏中点物品拾取或丢弃；搜刮时敌人仍在行动。

## 文件

- `harbor-game/`：React + Three.js 游戏源码，纯规则位于 `lib/simulation.ts`。
- `assets/harbor/TokyoHarbor.blend`：港区与角色 Blender 源文件。
- `assets/harbor/harbor.glb`、`scavenger.glb`、`level.json`：游戏地图、角色、碰撞及物资数据。
- `assets/build_harbor.py`：Blender 场景生成脚本。
- `assets/harbor/port-review.png`：Cycles 场景检查图。
- `assets/Arsenal-Realistic.blend`、`assets/export/models/`、`assets/textures/`：原七种枪械及 PBR 材质资产。
- `assets/reviews/`、`assets/Arsenal.blend`、`public/models/`：之前的渲染与早期模型，继续保留。

## 验证

在 `harbor-game` 运行 `npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`。测试覆盖全部物资与撤离可达性、出生位置、碰撞、寻路、暂停、换弹、搜索、负重、交火、死亡、撤离结算、仓库出售，以及 GLB 静态几何合并。地图 1,340 个网格合并为 15 个材质批次。

已检查 Blender Cycles 渲染图；尚未进行浏览器内人工完整通关。WebMCP 状态读取与仓库出售接口按浏览器能力注册，当前未有受支持的验证上下文，未声称接口运行验证通过。
